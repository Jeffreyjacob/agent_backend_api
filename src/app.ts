import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { globalRateLimit } from "./middleware/rateLimit";
import cookieParser from "cookie-parser";
import { logger } from "./config/logger";
import crypto from "crypto";
import { NotFoundMiddleware } from "./middleware/notFoundMiddleware";
import { errorHandlerMiddleware } from "./middleware/errorHandler";
import { HealthCheck } from "./shared/healthCheck/healthCheck";
import { asyncHandler } from "./shared/utils/asyncHandler";
import { bullboardRouter } from "./jobs/bullBoard";
import authRoutes from "./module/authentication/auth.routes";
import userRoutes from "./module/users/user.route";
import propertyRoutes from "./module/property/property.route";
import bookingRoutes from "./module/bookings/booking.routes";

class App {
  public readonly express: Application;
  constructor() {
    this.express = express();
    this.setSecurityMiddleware();
    this.setParsingMiddleware();
    this.setLoggingMiddleware();
    this.setRouteMiddleware();
    this.setErrorMiddleware();
  }

  setSecurityMiddleware() {
    this.express.use(helmet());
    this.express.use(
      cors({
        origin:
          env.NODE_ENV === "production" ? env.ALLOWED_ORIGIN.split(",") : "*",
        methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
        allowedHeaders: ["Authorization", "Content-Type"],
      }),
    );
    this.express.use(globalRateLimit);
    this.express.use(compression());
  }
  setParsingMiddleware() {
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.express.set("trust proxy", 1);
    this.express.use(cookieParser());
  }
  setLoggingMiddleware() {
    if (env.NODE_ENV === "development") {
      this.express.use(morgan("dev"));
    } else if (env.NODE_ENV === "production") {
      this.express.use(
        morgan("combined", {
          stream: {
            write: (message) => logger.info(message.trim()),
          },
        }),
      );
    }
    this.express.use((req: Request, _res: Response, next: NextFunction) => {
      const requestId = crypto.randomUUID();
      req.requestId = requestId;
      req.log = logger.child({ requestId });
      next();
    });
  }
  setRouteMiddleware() {
    const healthCheck = new HealthCheck();
    this.express.get(
      "/health",
      asyncHandler(async (_req, res) => {
        const health = await healthCheck.getHealth();
        const statusCode = health.status === "health" ? 200 : 503;
        res.status(statusCode).json(health);
      }),
    );

    // const protectBullBoard = (): void => {};

    this.express.use("/admin/queues", bullboardRouter);
    this.express.use("/api/v1/auth", authRoutes);
    this.express.use("/api/v1/user", userRoutes);
    this.express.use("/api/v1/property", propertyRoutes);
    this.express.use("/api/v1/booking", bookingRoutes);
  }
  setErrorMiddleware() {
    this.express.use(NotFoundMiddleware);
    this.express.use(errorHandlerMiddleware);
  }
}

export const app = new App().express;
