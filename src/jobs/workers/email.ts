import { Worker } from "bullmq";
import { emailProcesser } from "../processer/email";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { bullmqConnections } from "../../config/bullConfig";

export const createEmailWorker = (): Worker => {
  const worker = new Worker("emailQueue", emailProcesser, {
    connection: bullmqConnections,
    concurrency: 10,
  });

  worker.on("ready", () => {
    logger.info("email is ready");
  });

  worker.on("completed", (job) => {
    logger.info(`email ${job.data.email} has been sent`);
  });

  worker.on("failed", (job, err) => {
    logger.warn(
      { err, jobId: job?.id, email: job?.data.email },
      "email has failed to sent",
    );
  });

  worker.on("error", (err) => {
    logger.error({ err }, "email error");
  });

  return worker;
};
