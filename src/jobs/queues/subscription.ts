import { Queue } from "bullmq";
import { bullmqConnections } from "../../config/bullConfig";

let subscriptionQueue: Queue | null = null;

export const getSubscriptionQueue = (): Queue => {
  if (!subscriptionQueue) {
    subscriptionQueue = new Queue("subscription_queue", {
      connection: bullmqConnections,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: { count: 100, age: 86400 },
        removeOnFail: { count: 50, age: 7 * 86400 },
      },
    });
  }

  return subscriptionQueue;
};
