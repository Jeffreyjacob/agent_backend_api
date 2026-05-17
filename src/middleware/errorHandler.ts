import { NextFunction, Request, Response } from "express";
import { AppError, ValidationError } from "../shared/error";
import { logger } from "../config/logger";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { ResponseHelper } from "../shared/utils/apiResponse";

export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let message: string = "Internal server error";
  let statusCode: number = 500;
  let code = "INTERNAL SERVER ERROR";
  let isOperational: boolean = true;
  let details: any;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;

    if (isOperational) {
      logger.warn({ err, path: req.path });
    } else {
      logger.fatal({ err, path: req.path });
    }
  } else if (err instanceof ValidationError) {
    message = err.message;
    code = err.code;
    statusCode = err.statusCode;
    details = err.details;
    logger.warn({ err, path: req.path });
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      message = "Resource conflict";
      code = "CONFLICT_ERROR";
      statusCode = 409;
      logger.warn({ err, path: req.path });
    }
    if (err.code === "P2025") {
      message = "Resource not found";
      code = "NOT_FOUND";
      statusCode = 404;
      logger.warn({ err, path: req.path });
    }
  } else if (err instanceof jwt.TokenExpiredError) {
    message = err.message;
    code = "UNAUTHORIZED";
    statusCode = 401;
    logger.warn({ err, path: req.path });
  } else if (err instanceof jwt.JsonWebTokenError) {
    message = err.message;
    code = "UNAUTHORIZED";
    statusCode = 401;
    logger.warn({ err, path: req.path });
  } else {
    logger.fatal({ err, path: req.path });
  }

  if (!res.headersSent) {
    ResponseHelper.error(res, message, statusCode, code, details);
  }
};
