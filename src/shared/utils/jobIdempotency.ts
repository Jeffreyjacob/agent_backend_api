import { redis } from "../../config/redis";

export async function ensureIdempotency(jobId: string) {
  const key = `processed:${jobId}`;
  const acquired = await redis.set(key, "1", "EX", 86400, "NX");
  return acquired === "OK";
}
