import mongoose from "mongoose";
const settlementSchema = mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountInLamports: {
      type: Number,
      required: true,
    },
    txSignature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);
export const Settlement = mongoose.model("Settlement", settlementSchema);
