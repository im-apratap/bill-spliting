import { prisma } from "../db/prisma.js";

const formatHistory = (h) => ({
  ...h,
  _id: h.id,
  group: h.group ? { ...h.group, _id: h.group.id } : null,
});

export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const historyLog = await prisma.history.findMany({
      where: { userId },
      include: {
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    res.status(200).json(historyLog.map(formatHistory));
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
