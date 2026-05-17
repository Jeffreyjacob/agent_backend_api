import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 500 * Math.pow(2, times), 30000);
  },
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis error"));
redis.on("end", () => {
  logger.error("Redis gave up connecting, Shutting down");
  process.exit(1);
});

export async function disconnectRedis(): Promise<void> {
  if (!redis) {
    logger.warn("redis not initialized");
    return;
  }
  return redis.disconnect();
}
