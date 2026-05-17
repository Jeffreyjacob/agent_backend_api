import { ConnectionOptions } from "bullmq";
import { env } from "./env";

export const bullmqConnections: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    return Math.min(times * 500 * Math.pow(2, times), 30000);
  },
};
