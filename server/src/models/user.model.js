import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    pubKey: {
      type: String,
      required: true,
      unique: true,
    },
    refreshToken: {
      type: String,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    expoPushToken: {
      type: String,
    },
  },
  { timestamps: true },
);
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { userId: this._id, email: this.email, username: this.username },
    ENV.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" },
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ userId: this._id }, ENV.REFRESH_TOKEN_SECRET, {
    expiresIn: "10d",
  });
};
export const User = mongoose.model("User", userSchema);
