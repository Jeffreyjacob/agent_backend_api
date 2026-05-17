import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env";
import RedisStore, { RedisReply } from "rate-limit-redis";
import { redis } from "../config/redis";

function getStore(prefix: string): RedisStore {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) => {
      const client = redis;
      return client.call(command, ...args) as Promise<RedisReply>;
    },
  });
}

export const globalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many request, please try again later",
  },
  store: getStore("global"),
});

export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many request, please try again later",
  },
  store: getStore("auth"),
});

export const userRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 200,
  keyGenerator: (req: any) => (req.user.id as string) ?? ipKeyGenerator(req),
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore("user"),
});
