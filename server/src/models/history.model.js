import mongoose from "mongoose";
const HistorySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actionType: {
      type: String,
      enum: [
        "GROUP_CREATED",
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
        "EXPENSE_ADDED",
        "EXPENSE_DELETED",
        "SETTLEMENT_CREATED",
        "SETTLEMENT_CONFIRMED",
        "FRIEND_ADDED",
      ],
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    description: {
      type: String,
    },
    txSignature: {
      type: String,
    },
  },
  { timestamps: true },
);
export const History = mongoose.model("History", HistorySchema);
