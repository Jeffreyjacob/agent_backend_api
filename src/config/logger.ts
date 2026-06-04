import { env } from "./env";
import pino from "pino";
const isDev = env.NODE_ENV === "development";
const hasLoki = !!process.env.LOKI_HOST;

const getTransport = () => {
  if (hasLoki) {
    return pino.transport({
      targets: [
        {
          target: "pino-loki",
          level: "info",
          options: {
            host: process.env.LOKI_HOST,
            labels: {
              app: "real-estate-api",
              env: env.NODE_ENV,
            },
            replaceTimestamp: true,
            silenceErrors: false,
          },
        },
        ...(isDev
          ? [
              {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "SYS:standard",
                  ignore: "pid,hostname",
                },
              },
            ]
          : []),
      ],
    });
  }

  if (isDev) {
    return pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    });
  }

  return undefined;
};

export const logger = pino(
  {
    level: isDev ? "debug" : "info",
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
  },
  getTransport(),
);
