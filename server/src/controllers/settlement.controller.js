import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  buildTransferTransaction,
  buildBatchTransferTransaction,
  verifyTransaction,
  getBalance,
  connection,
  getExchangeRates,
  getCachedExchangeRates,
} from "../utils/solana.js";
import { Expo } from "expo-server-sdk";
import { sendPushNotifications } from "../utils/notifications.js";

const formatSettlement = (s) => ({
  ...s,
  _id: s.id,
  from: s.from ? { ...s.from, _id: s.from.id } : null,
  to: s.to ? { ...s.to, _id: s.to.id } : null,
});

const calculateNetBalances = async (groupId) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, username: true, pubKey: true } } },
      },
    },
  });

  if (!group) throw new ApiError(404, "Group not found");

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true, shares: true },
  });

  const balances = {};
  group.members.forEach((m) => {
    balances[m.userId] = 0;
  });

  for (const expense of expenses) {
    const payerId = expense.paidById;
    if (balances[payerId] === undefined) balances[payerId] = 0;

    if (expense.splitType === "equal" || !expense.splitType) {
      const perPerson = expense.amount / expense.splits.length;
      balances[payerId] += expense.amount;
      expense.splits.forEach((split) => {
        if (balances[split.userId] === undefined) balances[split.userId] = 0;
        balances[split.userId] -= perPerson;
      });
    } else if (expense.splitType === "custom" && expense.shares.length > 0) {
      balances[payerId] += expense.amount;
      expense.shares.forEach((share) => {
        if (balances[share.userId] === undefined) balances[share.userId] = 0;
        balances[share.userId] -= share.amount;
      });
    } else if (expense.splitType === "percentage" && expense.shares.length > 0) {
      balances[payerId] += expense.amount;
      expense.shares.forEach((share) => {
        if (balances[share.userId] === undefined) balances[share.userId] = 0;
        balances[share.userId] -= (share.amount / 100) * expense.amount;
      });
    }
  }

  const confirmedSettlements = await prisma.settlement.findMany({
    where: { groupId, status: "confirmed" },
  });

  for (const settlement of confirmedSettlements) {
    const fromId = settlement.fromId;
    const toId = settlement.toId;
    if (balances[fromId] !== undefined) balances[fromId] += settlement.amount;
    if (balances[toId] !== undefined) balances[toId] -= settlement.amount;
  }

  const settlements = [];
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([userId, amount]) => {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ userId, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ userId, amount: rounded });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const settleAmount = Math.min(debtors[i].amount, creditors[j].amount);
    if (settleAmount > 0.01) {
      settlements.push({
        from: debtors[i].userId,
        to: creditors[j].userId,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }
    debtors[i].amount -= settleAmount;
    creditors[j].amount -= settleAmount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { group, settlements };
};

export const createSettlement = async (req, res, next) => {
  try {
    const { groupId, toUserId, amount, isFiat } = req.body;
    if (!groupId) {
      throw new ApiError(400, "groupId is required");
    }

    const { group, settlements } = await calculateNetBalances(groupId);

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    let userSettlements = settlements.filter((s) => s.from === req.user.id);

    if (toUserId && amount) {
      const matchingSettlement = userSettlements.find((s) => s.to === toUserId);
      if (!matchingSettlement) {
        throw new ApiError(400, "You do not owe this user anything according to the calculated balances.");
      }
      if (amount > matchingSettlement.amount + 0.05) {
        throw new ApiError(400, `You only owe ${matchingSettlement.amount} to this user.`);
      }
      userSettlements = [
        {
          from: req.user.id,
          to: toUserId,
          amount: Number(amount),
        },
      ];
    }

    if (userSettlements.length === 0) {
      return res.status(200).json(new ApiResponse(200, { transactions: [] }, "You don't owe anything in this group"));
    }

    const memberMap = {};
    group.members.forEach((m) => {
      memberMap[m.userId] = m.user;
    });

    const userPubKey = memberMap[req.user.id]?.pubKey;

    const exchangeRates = await getExchangeRates();
    const solPrice = exchangeRates.usd;
    const totalOweUSD = userSettlements.reduce((sum, s) => sum + s.amount, 0);
    const totalOweSOL = totalOweUSD / solPrice;

    // For crypto, verify balance
    if (!isFiat) {
      if (!userPubKey) {
        throw new ApiError(400, "Your wallet public key is not set");
      }
      const balance = await getBalance(userPubKey);
      if (balance < totalOweSOL) {
        throw new ApiError(400, `Insufficient balance. You have ${balance.toFixed(4)} SOL but owe ${totalOweSOL.toFixed(4)} SOL ($${totalOweUSD.toFixed(2)})`);
      }
    }

    const settlementRecords = [];
    for (const s of userSettlements) {
      const amountInSOL = s.amount / solPrice;
      const record = await prisma.settlement.create({
        data: {
          groupId,
          fromId: req.user.id,
          toId: s.to,
          amount: s.amount,
          amountInLamports: Math.round(amountInSOL * 1000000000),
          status: "pending",
        },
      });
      settlementRecords.push(record);
    }

    if (isFiat) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            settlements: userSettlements.map((s, i) => ({
              settlementId: settlementRecords[i].id,
              to: memberMap[s.to].username,
              toUpiId: memberMap[s.to].upiId,
              amount: s.amount,
            })),
            totalAmountUSD: totalOweUSD,
          },
          "Fiat settlement created. Proceed to UPI."
        )
      );
    }

    const transfers = userSettlements.map((s) => {
      const amountInSOL = s.amount / solPrice;
      return {
        toPubkey: memberMap[s.to].pubKey,
        amountInSOL: Math.max(0.000000001, amountInSOL),
        toUser: memberMap[s.to],
      };
    });

    const memo = JSON.stringify({
      type: "settlement",
      groupId: group.id,
      groupName: group.name,
      note: "Settled via OmniSplit",
    });

    let transactionData;
    if (transfers.length === 1) {
      transactionData = await buildTransferTransaction(userPubKey, transfers[0].toPubkey, transfers[0].amountInSOL, memo);
    } else {
      transactionData = await buildBatchTransferTransaction(userPubKey, transfers, memo);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          serializedTransaction: transactionData.transaction,
          blockhash: transactionData.blockhash,
          settlements: userSettlements.map((s, i) => ({
            settlementId: settlementRecords[i].id,
            to: memberMap[s.to].username,
            toPubKey: memberMap[s.to].pubKey,
            amount: s.amount,
          })),
          totalAmount: totalOweSOL,
          totalAmountUSD: totalOweUSD,
        },
        "Settlement transaction created. Sign and submit from your wallet."
      )
    );
  } catch (error) {
    next(error);
  }
};

export const confirmSettlement = async (req, res, next) => {
  try {
    const { settlementIds, txSignature } = req.body;
    if (!settlementIds || !txSignature) {
      throw new ApiError(400, "settlementIds and txSignature are required");
    }

    const verification = await verifyTransaction(txSignature);
    if (!verification.confirmed) {
      await prisma.settlement.updateMany({
        where: { id: { in: settlementIds } },
        data: { status: "failed", txSignature },
      });
      throw new ApiError(400, "Transaction not confirmed on Solana");
    }

    await prisma.settlement.updateMany({
      where: { id: { in: settlementIds } },
      data: { status: "confirmed", txSignature },
    });

    const updatedSettlements = await prisma.settlement.findMany({
      where: { id: { in: settlementIds } },
      include: {
        from: { select: { id: true, name: true, username: true, pubKey: true } },
        to: { select: { id: true, name: true, username: true, pubKey: true } },
        group: { select: { id: true, name: true } },
      },
    });

    for (const s of updatedSettlements) {
      await prisma.history.create({
        data: {
          userId: s.fromId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: s.groupId,
          description: `You settled $${s.amount.toFixed(2)} with ${s.to.name}`,
          txSignature,
        },
      });
      await prisma.history.create({
        data: {
          userId: s.toId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: s.groupId,
          description: `${s.from.name} settled $${s.amount.toFixed(2)} with you`,
          txSignature,
        },
      });
    }

    return res.status(200).json(
      new ApiResponse(200, { settlements: updatedSettlements.map(formatSettlement), txSignature }, "Settlement confirmed on-chain")
    );
  } catch (error) {
    next(error);
  }
};

export const submitSignedTransaction = async (req, res, next) => {
  try {
    const { signedTransaction, settlementIds } = req.body;
    if (!signedTransaction || !settlementIds) {
      throw new ApiError(400, "signedTransaction and settlementIds are required");
    }

    const txBuffer = Buffer.from(signedTransaction, "base64");
    const txSignature = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction(
      { signature: txSignature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (confirmation.value.err) {
      await prisma.settlement.updateMany({
        where: { id: { in: settlementIds } },
        data: { status: "failed", txSignature },
      });
      throw new ApiError(400, "Transaction failed on-chain");
    }

    await prisma.settlement.updateMany({
      where: { id: { in: settlementIds } },
      data: { status: "confirmed", txSignature },
    });

    const updatedSettlements = await prisma.settlement.findMany({
      where: { id: { in: settlementIds } },
      include: {
        from: { select: { id: true, name: true, username: true, pubKey: true } },
        to: { select: { id: true, name: true, username: true, pubKey: true, expoPushToken: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const messages = [];
    for (const s of updatedSettlements) {
      await prisma.history.create({
        data: {
          userId: s.fromId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: s.groupId,
          description: `You settled $${s.amount.toFixed(2)} with ${s.to.name}`,
          txSignature,
        },
      });
      await prisma.history.create({
        data: {
          userId: s.toId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: s.groupId,
          description: `${s.from.name} settled $${s.amount.toFixed(2)} with you`,
          txSignature,
        },
      });

      if (s.to.expoPushToken && Expo.isExpoPushToken(s.to.expoPushToken)) {
        messages.push({
          to: s.to.expoPushToken,
          sound: "default",
          title: "Payment Received",
          body: `${s.from.name} just paid you $${s.amount.toFixed(2)} in Crypto! 💸`,
          data: { groupId: s.groupId },
        });
      }
    }

    if (messages.length > 0) {
      sendPushNotifications(messages).catch(console.error);
    }

    return res.status(200).json(
      new ApiResponse(200, { settlements: updatedSettlements.map(formatSettlement), txSignature }, "Transaction submitted and confirmed on-chain!")
    );
  } catch (error) {
    next(error);
  }
};

export const submitFiatSettlement = async (req, res, next) => {
  try {
    const { settlementIds } = req.body;
    if (!settlementIds || !Array.isArray(settlementIds)) {
      throw new ApiError(400, "settlementIds array is required");
    }

    const txSignature = `FIAT_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await prisma.settlement.updateMany({
      where: { id: { in: settlementIds } },
      data: { status: "confirmed", txSignature },
    });

    const updatedSettlements = await prisma.settlement.findMany({
      where: { id: { in: settlementIds } },
      include: {
        from: { select: { id: true, name: true, username: true } },
        to: { select: { id: true, name: true, username: true, expoPushToken: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const messages = [];
    for (const s of updatedSettlements) {
      await prisma.history.create({
        data: {
          userId: s.fromId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: s.groupId,
          description: `You settled $${s.amount.toFixed(2)} with ${s.to.name} via Fiat`,
          txSignature,
        },
      });
      await prisma.history.create({
        data: {
          userId: s.toId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: s.groupId,
          description: `${s.from.name} settled $${s.amount.toFixed(2)} with you via Fiat`,
          txSignature,
        },
      });

      if (s.to.expoPushToken && Expo.isExpoPushToken(s.to.expoPushToken)) {
        messages.push({
          to: s.to.expoPushToken,
          sound: "default",
          title: "Fiat Payment Received",
          body: `${s.from.name} just paid you $${s.amount.toFixed(2)} via Fiat! 💸`,
          data: { groupId: s.groupId },
        });
      }
    }

    if (messages.length > 0) {
      sendPushNotifications(messages).catch(console.error);
    }

    return res.status(200).json(
      new ApiResponse(200, { settlements: updatedSettlements.map(formatSettlement), txSignature }, "Fiat settlement confirmed!")
    );
  } catch (error) {
    next(error);
  }
};

export const getGroupSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        from: { select: { id: true, name: true, username: true, pubKey: true } },
        to: { select: { id: true, name: true, username: true, pubKey: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(
      new ApiResponse(200, settlements.map(formatSettlement), "Settlements fetched successfully")
    );
  } catch (error) {
    next(error);
  }
};

export const getWalletBalance = async (req, res, next) => {
  try {
    const pubKey = req.user.pubKey;
    if (!pubKey) {
      throw new ApiError(400, "Wallet public key not set");
    }
    const balance = await getBalance(pubKey);
    return res.status(200).json(new ApiResponse(200, { balance, pubKey }, "Balance fetched"));
  } catch (error) {
    next(error);
  }
};

export const getSolPrice = async (req, res, next) => {
  try {
    const { rates, updatedAt } = await getCachedExchangeRates();
    return res.status(200).json(
      new ApiResponse(200, { priceUSD: rates.usd, priceINR: rates.inr, updatedAt }, "SOL prices fetched")
    );
  } catch (error) {
    next(error);
  }
};
