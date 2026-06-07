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
import swaggerUi from "swagger-ui-express";
import authRoutes from "./module/authentication/auth.routes";
import userRoutes from "./module/users/user.routes";
import propertyRoutes from "./module/property/property.routes";
import bookingRoutes from "./module/bookings/booking.routes";
import reviewRoutes from "./module/reviews/review.routes";
import savedPropertyRoutes from "./module/savedProperty/savedproperty.routes";
import paymentRoutes from "./module/payments/payment.routes";
import subscriptionRoute from "./module/subscription/subscription.routes";
import adminRoutes from "./module/admin/admin.routes";
import { swaggerSpec } from "./config/swagger";

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
    this.express.use((req, res, next) => {
      if (req.originalUrl === "/api/v1/payment/webhook/stripe") {
        next();
      } else {
        express.json()(req, res, next);
      }
    });
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
        const statusCode = health.status === "healthy" ? 200 : 503;
        res.status(statusCode).json(health);
      }),
    );

    this.express.use(
      "/api/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Real Estate API Docs",
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
        },
      }),
    );

    this.express.get("/api/docs.json", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });

    // const protectBullBoard = (): void => {};

    this.express.use("/api/v1/auth", authRoutes);
    this.express.use("/api/v1/users", userRoutes);
    this.express.use("/api/v1/properties", propertyRoutes);
    this.express.use("/api/v1/bookings", bookingRoutes);
    this.express.use("/api/v1/reviews", reviewRoutes);
    this.express.use("/api/v1/saved", savedPropertyRoutes);
    this.express.use("/api/v1/payments", paymentRoutes);
    this.express.use("/api/v1/subscriptions", subscriptionRoute);
    this.express.use("/api/v1/admin", adminRoutes);
  }
  setErrorMiddleware() {
    this.express.use(NotFoundMiddleware);
    this.express.use(errorHandlerMiddleware);
  }
}

export const app = new App().express;
