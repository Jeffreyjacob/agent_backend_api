import { prisma } from "./config/database";
import { logger } from "./config/logger";
import { disconnectRedis, redis } from "./config/redis";
import { createCancelBookingWorker } from "./jobs/workers/cancelBooking";
import { createEmailWorker } from "./jobs/workers/email";
import { createSubscriptionWorker } from "./jobs/workers/subscription";
import { createUploadImageWorker } from "./jobs/workers/uploadImage";
import { BookingRepository } from "./module/bookings/booking.repository";
import { PropertyImageRepository } from "./module/property/propertyImage.repository";
import { UserRepositrory } from "./module/users/user.repository";

export const startWorker = async () => {
  try {
    logger.info("starting worker...");

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

    logger.info("Workers started successfully");

    // Return shutdown function
    return {
      shutdown: async () => {
        await emailWorker.close();
        await uploadImageWorker.close();
        await cancelBookingWorker.close();
        await subscriptionWorker.close();
        logger.info("Workers shut down");
      },
    };
  } catch (error: any) {
    logger.fatal({ err: error }, "unable to start workers");
    throw error;
  }
};

// Standalone mode for local development
if (require.main === module) {
  (async () => {
    await prisma.$connect();
    await redis.ping();
    const instance = await startWorker();

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "shutting down worker");
      await instance.shutdown();
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err }, "uncaughtException");
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason }, "unhandledRejection");
      shutdown("unhandledRejection");
    });
  })().catch((err) => {
    logger.error({ err }, "Failed to start worker standalone");
    process.exit(1);
  });
}
