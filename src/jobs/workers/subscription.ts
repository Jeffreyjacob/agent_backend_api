import { Worker } from "bullmq";
import { createSubscriptionProcessor } from "../processer/subscription";
import {
  subscriptionRepo,
  subscriptionService,
  userRepo,
} from "../../container";
import { bullmqConnections } from "../../config/bullConfig";
import { logger } from "../../config/logger";

export const createSubscriptionWorker = (): Worker => {
  const worker = new Worker(
    "subscription_queue",
    createSubscriptionProcessor(
      subscriptionService,
      subscriptionRepo,
      userRepo,
    ),
    {
      connection: bullmqConnections,
    },
  );

  worker.on("ready", () => {
    logger.info("subscription worker is ready");
  });

  worker.on("completed", (job) => {
    logger.info(`subscription job completed ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    logger.warn({ err, jobId: job?.id }, "subscription job failed");
  });

  worker.on("error", (err) => {
    logger.warn({ err }, "subscription worker error");
  });

  return worker;
};
