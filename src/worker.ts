import { prisma } from "./config/database";
import { logger } from "./config/logger";
import { disconnectRedis } from "./config/redis";
import { createCancelBookingWorker } from "./jobs/workers/cancelBooking";
import { createEmailWorker } from "./jobs/workers/email";
import { createSubscriptionWorker } from "./jobs/workers/subscription";
import { createUploadImageWorker } from "./jobs/workers/uploadImage";
import { BookingRepository } from "./module/bookings/booking.repository";
import { PropertyImageRepository } from "./module/property/propertyImage.repository";
import { UserRepositrory } from "./module/users/user.repository";

const startWorker = async () => {
  try {
    logger.info("starting worker...");
    await prisma.$connect();
    const propertImageRepo = new PropertyImageRepository();
    const bookingRepo = new BookingRepository();
    const userRepo = new UserRepositrory();
    const emailWorker = createEmailWorker();
    const uploadImageWorker = createUploadImageWorker(propertImageRepo);
    const cancelBookingWorker = createCancelBookingWorker(
      bookingRepo,
      userRepo,
    );
    const subscriptionWorker = createSubscriptionWorker();

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
        await uploadImageWorker.close();
        await cancelBookingWorker.close();
        await subscriptionWorker.close();
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
