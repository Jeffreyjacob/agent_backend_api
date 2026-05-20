import { Queue } from "bullmq";
import { redis } from "../../config/redis";
import { bullmqConnections } from "../../config/bullConfig";

let emailQueue: Queue | null = null;

export const getEmailQueue = (): Queue => {
  if (!emailQueue) {
    emailQueue = new Queue("emailQueue", {
      connection: bullmqConnections,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: 50,
        removeOnFail: false,
      },
    });
  }
  return emailQueue;
};
