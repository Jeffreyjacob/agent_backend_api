import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../shared/error";
import { verifyAccessToken } from "../shared/utils/tokenUtil";
import { redis } from "../config/redis";
import { Role } from "@prisma/client";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer "))
      throw new UnauthorizedError("No token provided, you must log in");

    const token = authHeader.split(" ")[1];
    if (!token) throw new UnauthorizedError("no token founds");

    const jwt = verifyAccessToken(token);

    const isBlacklisted = await redis.get(`BlacklistToken:${token}`);
    if (isBlacklisted)
      throw new UnauthorizedError("token has been blacklisted");

    req.user = jwt;
    req.token = token;
    next();
  } catch (error: any) {
    next(error);
  }
};

export const requireRole = (...role: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError("you must  be logged in");

    if (!role.includes(req.user.role)) {
      return next(
        new ForbiddenError("you don't have permission to this endpoint"),
      );
    }
    next();
  };
};
