import { Queue } from "bullmq";
import { getEmailQueue } from "./queues/email";

export const allQueues: Queue[] = [getEmailQueue()];
