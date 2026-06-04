import { Job, Worker } from "bullmq";
import {
  IUploadImageJobData,
  uploadImageProcessor,
} from "../processer/uploadImage";
import { bullmqConnections } from "../../config/bullConfig";
import { logger } from "../../config/logger";
import { PropertyImageRepository } from "../../module/property/propertyImage.repository";

export const createUploadImageWorker = (
  propertyImageRepo: PropertyImageRepository,
): Worker => {
  const worker = new Worker(
    "uploadPropertyImage",
    async (job: Job<IUploadImageJobData>) =>
      uploadImageProcessor(job, propertyImageRepo),
    {
      connection: bullmqConnections,
      concurrency: 3,
    },
  );

  worker.on("ready", () => {
    logger.info("upload property image worker is ready");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "upload property image worker completed");
  });

  worker.on("failed", (job, err) => {
    logger.warn({ err, jobId: job?.id }, "upload property image worker failed");
  });

  worker.on("error", (err) => {
    logger.warn({ err }, "upload property image worker error");
  });

  return worker;
};
