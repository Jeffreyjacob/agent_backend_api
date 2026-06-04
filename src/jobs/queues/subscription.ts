import { Queue } from "bullmq";
import { bullmqConnections } from "../../config/bullConfig";
import { logger } from "../../config/logger";

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

// schedule nightly reconciliation

export const scheduleReconciliation = async (): Promise<void> => {
  const queue = getSubscriptionQueue();

  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === "reconcileSubscriptions") {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  await queue.add(
    "reconcileSubscriptions",
    {},
    {
      repeat: { cron: "0 2 * * *" } as any, // 2am every day
      jobId: "nightly-reconciliation",
    },
  );

  logger.info("Nightly reconciliation scheduled");
};
