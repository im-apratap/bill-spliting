import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { prisma } from "../db/prisma.js";

export const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.userId },
    });
    
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    
    // Exclude sensitive info
    delete user.password;
    delete user.refreshToken;
    
    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, error?.message || "Invalid access token"));
  }
};
