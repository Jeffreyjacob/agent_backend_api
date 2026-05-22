import Redis from "ioredis";

export class CacheService {
  constructor(private readonly redis: Redis) {}

  private addJitter(ttl: number): number {
    const jitter = Math.floor(Math.random() * ttl * 0.2);
    return ttl + jitter;
  }

  async get<T>(cacheKey: string): Promise<T | null> {
    const result = await this.redis.get(cacheKey);
    if (result) {
      return JSON.parse(result);
    }
    return null;
  }

  async set<T>(cacheKey: string, data: T, ttl: number): Promise<string> {
    const converted = JSON.stringify(data);
    const result = this.redis.set(
      cacheKey,
      converted,
      "EX",
      this.addJitter(ttl),
    );

    return result;
  }

  async del(cacheKey: string): Promise<void> {
    await this.redis.del(cacheKey);
  }

  async scanAndDelete(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on("data", async (keys: string[]) => {
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    });

    await new Promise((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });
  }

  async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    const result = await this.redis.set(`lock:${key}`, "1", "EX", ttl, "NX");
    return result === "OK";
  }

  async releaseLock(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }
}
