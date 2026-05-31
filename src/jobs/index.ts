import { Queue } from "bullmq";
import { getEmailQueue } from "./queues/email";
import { getUploadImageQueue } from "./queues/uploadImage";
import { getCancelBookingQueue } from "./queues/cancelBooking";
import { getSubscriptionQueue } from "./queues/subscription";

export const allQueues: Queue[] = [
  getEmailQueue(),
  getUploadImageQueue(),
  getCancelBookingQueue(),
  getSubscriptionQueue(),
];
