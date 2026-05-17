import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { redis } from "../../config/redis";
import { allQueues } from "../../jobs";

interface DependencyHealth {
  status: "healthy" | "unhealthy";
  latency: number;
  error?: string;
  counts?: Record<string, number>[];
}

interface HealthResponse {
  status: "health" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  dependancies: {
    database: DependencyHealth;
    redis: DependencyHealth;
    queue: DependencyHealth & { counts?: Record<string, number>[] };
  };
}

export class HealthCheck {
  private async checkDatabase(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        latency: Date.now() - start,
      };
    } catch (err: any) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        error: err.message,
      };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      await redis.ping();
      return { status: "healthy", latency: Date.now() - start };
    } catch (error: any) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        error: error.message,
      };
    }
  }

  private async checkQueue(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      const queues = await Promise.all(
        allQueues.map(async (queue) => await queue.getJobCounts()),
      );
      return {
        status: "healthy",
        latency: Date.now() - start,
        counts: queues,
      };
    } catch (error: any) {
      return { status: "unhealthy", latency: Date.now(), error: error.message };
    }
  }

  async getHealth(): Promise<HealthResponse> {
    const [database, redis, queue] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const isHealthy =
      database.status === "healthy" &&
      redis.status === "healthy" &&
      queue.status === "healthy";

    return {
      status: isHealthy ? "health" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "1.0",
      environment: env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      dependancies: { database, redis, queue },
    };
  }
}
