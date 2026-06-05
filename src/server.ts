import { app } from "./app";
import { prisma } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import http from "http";
import { disconnectRedis, redis } from "./config/redis";
import { startWorker } from "./worker";

async function startServer(): Promise<void> {
  try {
    logger.info("starting server...");
    await prisma.$connect();

    // Test redis connection
    await redis.ping();
    logger.info("Redis connected");

    // Start workers
    let workerInstance = null;
    if (env.NODE_ENV === "production") {
      workerInstance = await startWorker();
    }

    const server = http.createServer(app);
    server.listen(env.PORT, () => {
      logger.info(
        {
          pid: process.pid,
          port: env.PORT,
          env: env.NODE_ENV,
        },
        "Server is ready",
      );
    });

    const gracefulShutdown = (signal: string) => {
      logger.info({ signal }, "starting graceful shutdown");
      const forceExitTimer = setTimeout(() => {
        logger.info("shutting down - force existing");
        process.exit(1);
      }, 10_000);

      forceExitTimer.unref();
      server.close(async (err) => {
        try {
          if (err)
            logger.warn({ err, pid: process.pid }, "unable to close server");
          if (env.NODE_ENV === "production" && workerInstance) {
            await workerInstance.shutdown();
          }
          await prisma.$disconnect();
          await disconnectRedis();
          clearTimeout(forceExitTimer);
          logger.info("server shutdown gracefully");
          process.exit(0);
        } catch (cleanupErr: any) {
          logger.error(
            { err: cleanupErr, pid: process.pid },
            "Unable to graceful shutdown server",
          );
          process.exit(1);
        }
      });
    };
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err, pid: process.pid }, "uncaughtException error");
      gracefulShutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason, pid: process.pid }, "unhandledRejection Error");
      gracefulShutdown("unhandledRejection");
    });
  } catch (error: any) {
    logger.fatal({ err: error }, "Unable to start server");
    process.exit(1);
  }
}

startServer();
