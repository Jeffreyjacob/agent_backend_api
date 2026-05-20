import { prisma } from "./config/database";
import { logger } from "./config/logger";
import { disconnectRedis } from "./config/redis";
import { getEmailQueue } from "./jobs/queues/email";
import { createEmailWorker } from "./jobs/workers/email";

const startWorker = async () => {
  try {
    logger.info("starting worker...");
    await prisma.$connect();
    const emailWorker = createEmailWorker();

    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, "start graceful shut down ");
      const forceExitTimer = setTimeout(() => {
        logger.info("shutting down - force exit");
        process.exit(1);
      }, 10_000);
      forceExitTimer.unref();
      try {
        await prisma.$disconnect();
        await disconnectRedis();
        clearTimeout(forceExitTimer);
        await emailWorker.close();
        logger.info("shutting down gracefully");
        process.exit(0);
      } catch (error: any) {
        logger.fatal({ err: error }, "unable to shutdown gracefull");
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err, pid: process.pid }, "uncaughtException error");
      gracefulShutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason, pid: process.pid }, "unhandledRejection Error");
      gracefulShutdown("unhandledRejection");
    });
  } catch (error: any) {
    logger.fatal({ err: error }, "unable to start server");
    process.exit(1);
  }
};

startWorker();
