import { prisma } from "../db/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ENV } from "../config/env.js";

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    ENV.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign({ userId: user.id }, ENV.REFRESH_TOKEN_SECRET, {
    expiresIn: "10d",
  });
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("[generateAccessAndRefreshToken Error]: ", error);
    throw new ApiError(
      500,
      `Something went wrong while generating access and refresh token: ${error.message}`
    );
  }
};

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

const excludeFields = (user, keys) => {
  for (let key of keys) {
    delete user[key];
  }
  return user;
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, pubKey } = req.body;
    if (!name || !username || !email || !password || !pubKey) {
      throw new ApiError(400, "All fields are required");
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: username.toLowerCase() },
          { pubKey },
        ],
      },
    });

    if (existingUser) {
      throw new ApiError(
        400,
        "User with this email, username, or pubKey already exists"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        username: username.toLowerCase(),
        email,
        password: hashedPassword,
        pubKey,
      },
    });

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user.id
    );

    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    return res
      .status(201)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          201,
          { user: excludeFields(createdUser, ["password", "refreshToken"]), accessToken, refreshToken },
          "User registered successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!(username || email)) {
      throw new ApiError(400, "Username or email is required");
    }

    if (!password) {
      throw new ApiError(400, "Password is required");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email || "" }, { username: username || "" }],
      },
    });

    if (!user) {
      throw new ApiError(400, "Invalid Credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(400, "Invalid Credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user.id
    );

    const loggedInUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { user: excludeFields(loggedInUser, ["password", "refreshToken"]), accessToken, refreshToken },
          "User logged in successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, {}, "User logged out"));
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      ENV.REFRESH_TOKEN_SECRET
    );

    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.userId },
    });

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user.id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    return res
      .status(200)
      .json(new ApiResponse(200, req.user, "User fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const updatePubKey = async (req, res, next) => {
  try {
    const { pubKey } = req.body;
    if (!pubKey) throw new ApiError(400, "pubKey is required");

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { pubKey },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, excludeFields(user, ["password", "refreshToken"]), "Public key updated successfully")
      );
  } catch (error) {
    next(error);
  }
};

export const updatePushToken = async (req, res, next) => {
  try {
    const { expoPushToken } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { expoPushToken },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, excludeFields(user, ["password", "refreshToken"]), "Push token updated successfully")
      );
  } catch (error) {
    next(error);
  }
};

export const updateUpiId = async (req, res, next) => {
  try {
    const { upiId } = req.body;
    if (upiId === undefined) throw new ApiError(400, "upiId is required");

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { upiId },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, excludeFields(user, ["password", "refreshToken"]), "UPI ID updated successfully")
      );
  } catch (error) {
    next(error);
  }
};
