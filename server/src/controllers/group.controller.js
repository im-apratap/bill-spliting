import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const formatGroup = (g) => {
  return {
    ...g,
    _id: g.id,
    members: g.members?.map(m => ({ ...m.user, _id: m.user.id })) || [],
    createdBy: g.createdBy ? { ...g.createdBy, _id: g.createdBy.id } : null,
  };
};

export const createGroup = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      throw new ApiError(400, "Group name is required");
    }

    const group = await prisma.group.create({
      data: {
        name,
        creatorId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, pubKey: true } },
          },
        },
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    await prisma.history.create({
      data: {
        userId: req.user.id,
        actionType: "GROUP_CREATED",
        groupId: group.id,
        description: `You created group "${name}"`,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(201, formatGroup(group), "Group created successfully"));
  } catch (error) {
    next(error);
  }
};

export const getUserGroups = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId: req.user.id },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, pubKey: true } },
          },
        },
        createdBy: { select: { id: true, name: true, username: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, groups.map(formatGroup), "Groups fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const getGroupById = async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, pubKey: true } },
          },
        },
        createdBy: { select: { id: true, name: true, username: true } },
      },
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
      .json(new ApiResponse(200, formatGroup(group), "Group fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const { username } = req.body;
    const { groupId } = req.params;

    if (!username) {
      throw new ApiError(400, "Username is required");
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (group.creatorId !== req.user.id) {
      throw new ApiError(403, "Only the group creator can add members");
    }

    const userToAdd = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!userToAdd) {
      throw new ApiError(404, "User not found");
    }

    const isAlreadyMember = group.members.some((m) => m.userId === userToAdd.id);
    if (isAlreadyMember) {
      throw new ApiError(400, "User is already a member of this group");
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: userToAdd.id,
      },
    });

    const updatedGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, pubKey: true } },
          },
        },
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    await prisma.history.create({
      data: {
        userId: req.user.id,
        actionType: "MEMBER_ADDED",
        groupId,
        description: `You added ${userToAdd.name} to "${group.name}"`,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, formatGroup(updatedGroup), "Member added successfully"));
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (group.creatorId !== req.user.id) {
      throw new ApiError(403, "Only the group creator can remove members");
    }

    if (userId === group.creatorId) {
      throw new ApiError(400, "Cannot remove the group creator");
    }

    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId,
      },
    });

    const updatedGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, pubKey: true } },
          },
        },
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    const removedUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    const removedUserName = removedUser ? removedUser.name : "a member";

    await prisma.history.create({
      data: {
        userId: req.user.id,
        actionType: "MEMBER_REMOVED",
        groupId,
        description: `You removed ${removedUserName} from "${group.name}"`,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, formatGroup(updatedGroup), "Member removed successfully"));
  } catch (error) {
    next(error);
  }
};
