import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../shared/error";
import { verifyAccessToken } from "../shared/utils/tokenUtil";
import { redis } from "../config/redis";
import { Role } from "@prisma/client";
import { subscriptionRepo } from "../container";
import { prisma } from "../config/database";

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

export const requiredActiveSubscription = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId as string;

    if (!userId) throw new UnauthorizedError("Unauthorized");

    const subscription = await subscriptionRepo.findOne({
      userId,
      status: {
        in: ["ACTIVE", "TRIAL", "PAST_DUE"],
      },
    });

    if (!subscription)
      throw new ForbiddenError(
        "You need an active subscription to perform this action. Please subscribe to continue",
      );

    next();
  } catch (error: any) {
    next(error);
  }
};

export const checkPropertyLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new UnauthorizedError("unauthorized");

    const subscription = await subscriptionRepo.findOne({
      userId,
    });

    if (!subscription) throw new ForbiddenError("No active subscription");

    if (subscription.maxProperties === null) return next();

    const currentPackage = await prisma.packageRecord.findFirst({
      where: {
        userId,
        subscriptionCycleId: subscription.subscriptionCycleId!,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const propertisUsed = currentPackage?.propertiesUsed ?? 0;

    if (propertisUsed >= subscription.maxProperties) {
      throw new ForbiddenError(
        `You have reach your property limit of ${subscription.maxProperties} for this billing cycle. Please upgrade your plan.`,
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
};

export const checkFeaturedListingLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new UnauthorizedError("unauthorized");

    const subscription = await subscriptionRepo.findOne({
      userId,
    });

    if (!subscription) throw new ForbiddenError("No active subscription");

    if (subscription.maxFeatureListings === null) return next();

    const currentPackage = await prisma.packageRecord.findFirst({
      where: {
        userId,
        subscriptionCycleId: subscription.subscriptionCycleId!,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const featuredListingUsed = currentPackage?.featuredListingsUsed ?? 0;
    if (featuredListingUsed >= subscription.maxFeatureListings) {
      throw new ForbiddenError(
        `You have reached your featuredlisting limit of ${subscription.maxFeatureListings} for this billing cycle. Please upgrade your plan.`,
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
};
