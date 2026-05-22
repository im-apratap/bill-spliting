import { Expo } from "expo-server-sdk";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendPushNotifications } from "../utils/notifications.js";

const formatSettlement = (settlement) => ({
  ...settlement,
  _id: settlement.id,
  from: settlement.from ? { ...settlement.from, _id: settlement.from.id } : null,
  to: settlement.to ? { ...settlement.to, _id: settlement.to.id } : null,
});

const calculateNetBalances = async (groupId) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              upiId: true,
              expoPushToken: true,
            },
          },
        },
      },
    },
  });

  if (!group) throw new ApiError(404, "Group not found");

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true, shares: true },
  });

  const balances = {};
  group.members.forEach((member) => {
    balances[member.userId] = 0;
  });

  for (const expense of expenses) {
    const payerId = expense.paidById;
    if (balances[payerId] === undefined) balances[payerId] = 0;

    if (expense.splitType === "custom" && expense.shares.length > 0) {
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
    } else {
      const perPerson = expense.amount / expense.splits.length;
      balances[payerId] += expense.amount;
      expense.splits.forEach((split) => {
        if (balances[split.userId] === undefined) balances[split.userId] = 0;
        balances[split.userId] -= perPerson;
      });
    }
  }

  const confirmedSettlements = await prisma.settlement.findMany({
    where: { groupId, status: "confirmed" },
  });

  for (const settlement of confirmedSettlements) {
    if (balances[settlement.fromId] !== undefined) {
      balances[settlement.fromId] += settlement.amount;
    }
    if (balances[settlement.toId] !== undefined) {
      balances[settlement.toId] -= settlement.amount;
    }
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

  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const settleAmount = Math.min(
      debtors[debtorIndex].amount,
      creditors[creditorIndex].amount,
    );
    if (settleAmount > 0.01) {
      settlements.push({
        from: debtors[debtorIndex].userId,
        to: creditors[creditorIndex].userId,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtors[debtorIndex].amount -= settleAmount;
    creditors[creditorIndex].amount -= settleAmount;
    if (debtors[debtorIndex].amount < 0.01) debtorIndex++;
    if (creditors[creditorIndex].amount < 0.01) creditorIndex++;
  }

  return { group, settlements };
};

export const createSettlement = async (req, res, next) => {
  try {
    const { groupId, toUserId, amount } = req.body;
    if (!groupId) {
      throw new ApiError(400, "groupId is required");
    }

    const { group, settlements } = await calculateNetBalances(groupId);
    const isMember = group.members.some((member) => member.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    let userSettlements = settlements.filter(
      (settlement) => settlement.from === req.user.id,
    );

    if (toUserId && amount) {
      const matchingSettlement = userSettlements.find(
        (settlement) => settlement.to === toUserId,
      );
      if (!matchingSettlement) {
        throw new ApiError(
          400,
          "You do not owe this user anything according to the calculated balances.",
        );
      }
      if (Number(amount) > matchingSettlement.amount + 0.05) {
        throw new ApiError(
          400,
          `You only owe ${matchingSettlement.amount} to this user.`,
        );
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
      return res
        .status(200)
        .json(new ApiResponse(200, { settlements: [] }, "You don't owe anything in this group"));
    }

    const memberMap = {};
    group.members.forEach((member) => {
      memberMap[member.userId] = member.user;
    });

    const settlementRecords = [];
    for (const settlement of userSettlements) {
      const record = await prisma.settlement.create({
        data: {
          groupId,
          fromId: req.user.id,
          toId: settlement.to,
          amount: settlement.amount,
          status: "pending",
        },
      });
      settlementRecords.push(record);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          settlements: userSettlements.map((settlement, index) => ({
            settlementId: settlementRecords[index].id,
            to: memberMap[settlement.to].username,
            toUpiId: memberMap[settlement.to].upiId,
            amount: settlement.amount,
          })),
          totalAmountUSD: userSettlements.reduce(
            (sum, settlement) => sum + settlement.amount,
            0,
          ),
        },
        "Settlement created. Proceed to UPI.",
      ),
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

    await prisma.settlement.updateMany({
      where: { id: { in: settlementIds } },
      data: { status: "confirmed" },
    });

    const updatedSettlements = await prisma.settlement.findMany({
      where: { id: { in: settlementIds } },
      include: {
        from: { select: { id: true, name: true, username: true } },
        to: {
          select: {
            id: true,
            name: true,
            username: true,
            expoPushToken: true,
          },
        },
        group: { select: { id: true, name: true } },
      },
    });

    const messages = [];
    for (const settlement of updatedSettlements) {
      await prisma.history.create({
        data: {
          userId: settlement.fromId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: settlement.groupId,
          description: `You settled $${settlement.amount.toFixed(2)} with ${settlement.to.name} via UPI`,
        },
      });
      await prisma.history.create({
        data: {
          userId: settlement.toId,
          actionType: "SETTLEMENT_CONFIRMED",
          groupId: settlement.groupId,
          description: `${settlement.from.name} settled $${settlement.amount.toFixed(2)} with you via UPI`,
        },
      });

      if (
        settlement.to.expoPushToken &&
        Expo.isExpoPushToken(settlement.to.expoPushToken)
      ) {
        messages.push({
          to: settlement.to.expoPushToken,
          sound: "default",
          title: "Payment Received",
          body: `${settlement.from.name} just paid you $${settlement.amount.toFixed(2)} via UPI.`,
          data: { groupId: settlement.groupId },
        });
      }
    }

    if (messages.length > 0) {
      sendPushNotifications(messages).catch(console.error);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { settlements: updatedSettlements.map(formatSettlement) },
        "Settlement confirmed!",
      ),
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
        from: { select: { id: true, name: true, username: true } },
        to: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        settlements.map(formatSettlement),
        "Settlements fetched successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};
