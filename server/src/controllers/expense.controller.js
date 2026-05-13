import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Expo } from "expo-server-sdk";
import { sendPushNotifications } from "../utils/notifications.js";
import { getCachedExchangeRates } from "../utils/solana.js";

const formatExpense = (e) => {
  return {
    ...e,
    _id: e.id,
    paidBy: e.paidBy ? { ...e.paidBy, _id: e.paidBy.id } : null,
    splitAmong: e.splits?.map((s) => ({ ...s.user, _id: s.user.id })) || [],
    shares: e.shares?.map((s) => ({
      amount: s.amount,
      user: { ...s.user, _id: s.user.id },
    })) || [],
  };
};

export const addExpense = async (req, res, next) => {
  try {
    let {
      description,
      amount,
      groupId,
      splitType,
      splitAmong,
      shares,
      currency,
    } = req.body;

    if (!description || !amount || !groupId) {
      throw new ApiError(400, "Description, amount, and groupId are required");
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    const participants = splitAmong || group.members.map((m) => m.userId);

    if (splitType === "custom" && shares) {
      const totalShares = shares.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalShares - amount) > 0.01) {
        throw new ApiError(400, "Custom shares must add up to the total amount");
      }
    }
    if (splitType === "percentage" && shares) {
      const totalPercentage = shares.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new ApiError(400, "Percentage shares must add up to 100");
      }
    }

    if (currency && currency.toUpperCase() === "INR") {
      const { rates } = await getCachedExchangeRates();
      const inrToUsdRate = rates.usd / rates.inr;
      amount = amount * inrToUsdRate;

      if (splitType === "custom" && shares) {
        shares = shares.map((s) => ({
          ...s,
          amount: s.amount * inrToUsdRate,
        }));
      }
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        paidById: req.user.id,
        groupId,
        splitType: splitType || "equal",
        currency: "USD",
        splits: {
          create: participants.map((userId) => ({ userId })),
        },
        shares: {
          create: shares ? shares.map((s) => ({ userId: s.user || s.userId, amount: s.amount })) : [],
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, username: true, pubKey: true } },
        splits: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
        shares: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
      },
    });

    await prisma.history.create({
      data: {
        userId: req.user.id,
        actionType: "EXPENSE_ADDED",
        groupId,
        description: `You added expense "${description}" of ${amount} to "${group.name}"`,
      },
    });

    const messages = [];
    const pushTitle = `New Expense in ${group.name}`;
    const pushBody = `${req.user.name} added "${description}" for $${amount}`;
    let usersToNotify = [];

    if (splitType === "equal" || !splitType) {
      usersToNotify = group.members
        .map((m) => m.userId)
        .filter((id) => id !== req.user.id);
    } else if (splitType === "custom" || splitType === "percentage") {
      usersToNotify = shares
        .map((s) => s.user || s.userId)
        .filter((id) => id !== req.user.id);
    }

    if (usersToNotify.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: usersToNotify } },
      });
      for (const user of users) {
        if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
          messages.push({
            to: user.expoPushToken,
            sound: "default",
            title: pushTitle,
            body: pushBody,
            data: {
              groupId: group.id,
              expenseId: expense.id,
            },
          });
        }
      }
      if (messages.length > 0) {
        sendPushNotifications(messages).catch((err) =>
          console.error("Notification Error:", err)
        );
      }
    }

    return res
      .status(201)
      .json(new ApiResponse(201, formatExpense(expense), "Expense added successfully"));
  } catch (error) {
    next(error);
  }
};

export const getGroupExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true, username: true, pubKey: true } },
        splits: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
        shares: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, expenses.map(formatExpense), "Expenses fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const getGroupBalances = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, pubKey: true } },
          },
        },
      },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

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
      
      // Safety initialization
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

    const settlements = calculateSettlements(balances);

    const memberMap = {};
    group.members.forEach((m) => {
      memberMap[m.userId] = {
        _id: m.userId,
        name: m.user.name,
        username: m.user.username,
        pubKey: m.user.pubKey,
      };
    });

    const balanceDetails = Object.entries(balances).map(([userId, amount]) => ({
      user: memberMap[userId],
      netBalance: Math.round(amount * 100) / 100,
    })).filter(b => b.user); // Filter out users who left the group

    const settlementDetails = settlements.map((s) => ({
      from: memberMap[s.from],
      to: memberMap[s.to],
      amount: Math.round(s.amount * 100) / 100,
    })).filter(s => s.from && s.to);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          balances: balanceDetails,
          settlements: settlementDetails,
        },
        "Balances calculated successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

function calculateSettlements(balances) {
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
        amount: settleAmount,
      });
    }

    debtors[i].amount -= settleAmount;
    creditors[j].amount -= settleAmount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

export const deleteExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new ApiError(404, "Expense not found");
    }

    const group = await prisma.group.findUnique({
      where: { id: expense.groupId },
      include: { members: true },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    await prisma.expenseSplit.deleteMany({ where: { expenseId } });
    await prisma.expenseShare.deleteMany({ where: { expenseId } });
    await prisma.expense.delete({ where: { id: expenseId } });

    await prisma.history.create({
      data: {
        userId: req.user.id,
        actionType: "EXPENSE_DELETED",
        groupId: group.id,
        description: `You deleted expense "${expense.description}" of ${expense.amount} from "${group.name}"`,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Expense deleted successfully"));
  } catch (error) {
    next(error);
  }
};

export const getExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: { select: { id: true, name: true, username: true, pubKey: true } },
        splits: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
        shares: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
      },
    });

    if (!expense) {
      throw new ApiError(404, "Expense not found");
    }

    const group = await prisma.group.findUnique({
      where: { id: expense.groupId },
      include: { members: true },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, formatExpense(expense), "Expense fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { description, amount, splitType, splitAmong, shares } = req.body;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new ApiError(404, "Expense not found");
    }

    const group = await prisma.group.findUnique({
      where: { id: expense.groupId },
      include: { members: true },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    const isMember = group.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      throw new ApiError(403, "You are not a member of this group");
    }

    if (amount) {
      if (splitType === "custom" && shares) {
        const totalShares = shares.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalShares - amount) > 0.01) {
          throw new ApiError(400, "Custom shares must add up to the total amount");
        }
      }
      if (splitType === "percentage" && shares) {
        const totalPercentage = shares.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new ApiError(400, "Percentage shares must add up to 100");
        }
      }
    }

    const updateData = {};
    if (description) updateData.description = description;
    if (amount) updateData.amount = amount;
    if (splitType) updateData.splitType = splitType;

    // Delete existing splits/shares if they are being updated
    if (splitAmong || shares) {
      await prisma.expenseSplit.deleteMany({ where: { expenseId } });
      await prisma.expenseShare.deleteMany({ where: { expenseId } });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...updateData,
        ...(splitAmong && {
          splits: {
            create: splitAmong.map(userId => ({ userId }))
          }
        }),
        ...(shares && {
          shares: {
            create: shares.map(s => ({ userId: s.user || s.userId, amount: s.amount }))
          }
        })
      },
      include: {
        paidBy: { select: { id: true, name: true, username: true, pubKey: true } },
        splits: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
        shares: { include: { user: { select: { id: true, name: true, username: true, pubKey: true } } } },
      },
    });

    await prisma.history.create({
      data: {
        userId: req.user.id,
        actionType: "EXPENSE_ADDED", // keeping the enum logic same
        groupId: group.id,
        description: `You edited expense "${updatedExpense.description}" (${updatedExpense.amount}) in "${group.name}"`,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, formatExpense(updatedExpense), "Expense updated successfully"));
  } catch (error) {
    next(error);
  }
};
