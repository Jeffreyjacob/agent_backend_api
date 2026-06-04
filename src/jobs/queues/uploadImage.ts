import { Queue } from "bullmq";
import { bullmqConnections } from "../../config/bullConfig";

let uploadImageQueue: Queue | null = null;

export const getUploadImageQueue = (): Queue => {
  if (!uploadImageQueue) {
    uploadImageQueue = new Queue("uploadPropertyImage", {
      connection: bullmqConnections,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    });
  }

  return uploadImageQueue;
};
