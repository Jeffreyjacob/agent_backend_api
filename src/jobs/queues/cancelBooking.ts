import { Queue } from "bullmq";
import { bullmqConnections } from "../../config/bullConfig";

let cancelBookingQueue: Queue | null = null;

export const getCancelBookingQueue = (): Queue => {
  if (!cancelBookingQueue) {
    cancelBookingQueue = new Queue("cancelBooking", {
      connection: bullmqConnections,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    });
  }

  return cancelBookingQueue;
};
