import { Queue } from "bullmq";
import { getEmailQueue } from "./queues/email";
import { getUploadImageQueue } from "./queues/uploadImage";
import { getCancelBookingQueue } from "./queues/cancelBooking";

export const allQueues: Queue[] = [
  getEmailQueue(),
  getUploadImageQueue(),
  getCancelBookingQueue(),
];
