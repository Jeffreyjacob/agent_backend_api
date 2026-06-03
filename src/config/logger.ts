import { env } from "./env";
import pino from "pino";
const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? "debug" : "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
  redact: [
    "*.password",
    "*.token",
    "req.headers.authorization",
    "*.refreshtoken",
    "*.resetToken",
    "*.stripeCustomerId",
  ],
  base: {
    name: "real estate api",
    env: env.NODE_ENV,
  },
});
