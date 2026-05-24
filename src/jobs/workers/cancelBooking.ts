import { Job, Worker } from "bullmq";
import { BookingRepository } from "../../module/bookings/booking.repository";
import { cancelBookingProcesser } from "../processer/cancelBooking";
import { bullmqConnections } from "../../config/bullConfig";
import { logger } from "../../config/logger";
import { UserRepositrory } from "../../module/users/user.repository";

export interface ICancelBooking {
  bookingId: string;
  buyerId: string;
  propertyTitle: string;
  propertyAddress: string;
}

export const createCancelBookingWorker = (
  bookingRepo: BookingRepository,
  userRepo: UserRepositrory,
): Worker => {
  const worker = new Worker(
    "cancelBooking",
    async (job: Job<ICancelBooking>) =>
      cancelBookingProcesser(job, bookingRepo, userRepo),
    {
      connection: bullmqConnections,
      concurrency: 3,
    },
  );

  worker.on("ready", () => {
    logger.info("cancelBooking worker is ready");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job?.id }, "cancelBooking job is completed");
  });

  worker.on("failed", (job, err) => {
    logger.warn({ jobId: job?.id, err }, "cancelBooking job failed");
  });

  worker.on("error", (err) => {
    logger.warn({ err }, "cancel booking worker error");
  });

  return worker;
};
