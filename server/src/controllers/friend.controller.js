import { prisma } from "../db/prisma.js";

const formatUser = (user) => {
  return { ...user, _id: user.id };
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { username } = req.body;
    const senderId = req.user.id;
    
    const receiver = await prisma.user.findUnique({ where: { username } });
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (senderId === receiver.id) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { friends: true },
    });

    if (sender.friends.some(f => f.id === receiver.id)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
        status: "pending",
      },
    });

    if (existingRequest) {
      if (existingRequest.senderId === senderId) {
        return res.status(400).json({ message: "Friend request already sent" });
      } else {
        return res.status(400).json({
          message: "This user has already sent you a request. Please check your pending requests.",
        });
      }
    }

    const newRequest = await prisma.friendRequest.create({
      data: {
        senderId: senderId,
        receiverId: receiver.id,
      },
    });

    res.status(201).json({
      message: "Friend request sent successfully",
      request: { ...newRequest, _id: newRequest.id },
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const receiverId = req.user.id;

    const request = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: receiverId,
        status: "pending",
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found or already processed" });
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    });

    // Add each other as friends
    await prisma.user.update({
      where: { id: receiverId },
      data: { friends: { connect: { id: request.senderId } } },
    });
    await prisma.user.update({
      where: { id: request.senderId },
      data: { friends: { connect: { id: receiverId } } },
    });

    const senderUser = await prisma.user.findUnique({ where: { id: request.senderId } });
    const receiverUser = await prisma.user.findUnique({ where: { id: receiverId } });

    await prisma.history.create({
      data: {
        userId: receiverId,
        actionType: "FRIEND_ADDED",
        description: `You are now friends with ${senderUser.name}`,
      },
    });

    await prisma.history.create({
      data: {
        userId: request.senderId,
        actionType: "FRIEND_ADDED",
        description: `You are now friends with ${receiverUser.name}`,
      },
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const receiverId = req.user.id;

    const request = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: receiverId,
        status: "pending",
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found or already processed" });
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "declined" },
    });

    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.error("Error declining friend request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        friends: { select: { id: true, name: true, username: true, email: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.friends.map(formatUser));
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedRequests = requests.map(r => ({
      ...r,
      _id: r.id,
      sender: { ...r.sender, _id: r.sender.id },
    }));

    res.status(200).json(mappedRequests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
