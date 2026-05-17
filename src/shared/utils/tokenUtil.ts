import { User } from "@prisma/client";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { ITokenPayload } from "../../module/authentication/auth.interface";
import { logger } from "../../config/logger";
import { Response } from "express";

export const generateAccessToken = (user: User): string => {
  const signOptions: jwt.SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_ACCESS_SECRET,
    signOptions,
  );

  return token;
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as ITokenPayload;
    return decoded;
  } catch (err: any) {
    logger.warn({ err }, "unable to verify access token");
    throw err;
  }
};

export const setRefreshToken = ({
  res,
  refreshToken,
  expiresAt,
}: {
  res: Response;
  refreshToken: string;
  expiresAt: number;
}) => {
  res.cookie(env.REFRESHTOKEN_NAME, refreshToken, {
    expires: new Date(Date.now() + expiresAt * 24 * 60 * 60 * 1000),
    maxAge: expiresAt * 24 * 60 * 60 * 1000,
    httpOnly: env.NODE_ENV === "production" ? true : false,
    secure: env.NODE_ENV === "production" ? true : false,
    sameSite: "none",
    path: "/",
  });
};
