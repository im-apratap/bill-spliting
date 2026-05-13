import { History } from "../models/history.model.js";
export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const historyLog = await History.find({ user: userId })
      .populate("group", "name")
      .sort({ createdAt: -1 });
    res.status(200).json(historyLog);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
