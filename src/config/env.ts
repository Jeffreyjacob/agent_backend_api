import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

interface EnvConfig {
  NODE_ENV: "development" | "production" | "testing";
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  REFRESHTOKEN_NAME: string;
  REFRESHTOKEN_EXPIRES_IN: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  BCRYPT_ROUNDS: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_SERVICE: string;
  SMTP_PORT: number;
  SMTP_HOST: string;
  EMAIL_FROM: string;
  ALLOWED_ORIGIN: string;
  FRONTENDURL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_CLOUD_API_KEY: string;
  CLOUDINARY_CLOUD_API_SECRET: string;
  STRIPE_BASIC_MONTHLY_PRICE_ID: string;
  STRIPE_BASIC_QUARTERLY_PRICE_ID: string;
  STRIPE_BASIC_HALFYEAR_PRICE_ID: string;
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: string;
  STRIPE_PREMIUM_QUARTERLY_PRICE_ID: string;
  STRIPE_PREMIUM_HALFYEAR_PRICE_ID: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
}

const validatatEnv = (): EnvConfig => {
  const REQUIRED_ENV = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_ACCESS_SECRET",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_HOST",
    "EMAIL_FROM",
    "ALLOWED_ORIGIN",
    "REFRESHTOKEN_NAME",
    "REFRESHTOKEN_EXPIRES_IN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_CLOUD_API_KEY",
    "CLOUDINARY_CLOUD_API_SECRET",
    "STRIPE_BASIC_MONTHLY_PRICE_ID",
    "STRIPE_BASIC_QUARTERLY_PRICE_ID",
    "STRIPE_BASIC_HALFYEAR_PRICE_ID",
    "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
    "STRIPE_PREMIUM_QUARTERLY_PRICE_ID",
    "STRIPE_PREMIUM_HALFYEAR_PRICE_ID",
  ];

  const missing_env = REQUIRED_ENV.filter((env) => !process.env[env]);

  if (missing_env.length > 0) {
    console.error(`missing env variable ${missing_env.join(",")}`);
    process.exit(1);
  }

  return {
    NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) ?? "development",
    PORT: Number(process.env.PORT ?? 3000),
    DATABASE_URL: process.env.DATABASE_URL as string,
    REDIS_URL: process.env.REDIS_URL as string,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    REFRESHTOKEN_NAME: process.env.REFRESHTOKEN_NAME as string,
    REFRESHTOKEN_EXPIRES_IN: parseInt(process.env.REFRESHTOKEN_EXPIRES_IN!, 10),
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 100),
    BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS ?? 10),
    SMTP_USER: process.env.SMTP_USER as string,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD as string,
    SMTP_SERVICE: process.env.SMTP_SERVICE as string,
    SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
    SMTP_HOST: process.env.SMTP_HOST as string,
    EMAIL_FROM: process.env.EMAIL_FROM as string,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN as string,
    FRONTENDURL: process.env.FRONTENDURL || "http://localhost:5173",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
    CLOUDINARY_CLOUD_API_KEY: process.env.CLOUDINARY_CLOUD_API_KEY!,
    CLOUDINARY_CLOUD_API_SECRET: process.env.CLOUDINARY_CLOUD_API_SECRET!,
    STRIPE_BASIC_MONTHLY_PRICE_ID: process.env
      .STRIPE_BASIC_MONTHLY_PRICE_ID as string,
    STRIPE_BASIC_QUARTERLY_PRICE_ID: process.env
      .STRIPE_BASIC_QUARTERLY_PRICE_ID as string,
    STRIPE_BASIC_HALFYEAR_PRICE_ID: process.env
      .STRIPE_BASIC_HALFYEAR_PRICE_ID as string,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: process.env
      .STRIPE_PREMIUM_MONTHLY_PRICE_ID as string,
    STRIPE_PREMIUM_QUARTERLY_PRICE_ID: process.env
      .STRIPE_PREMIUM_QUARTERLY_PRICE_ID as string,
    STRIPE_PREMIUM_HALFYEAR_PRICE_ID: process.env
      .STRIPE_PREMIUM_HALFYEAR_PRICE_ID as string,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL as string,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD as string,
  };
};

export const env = validatatEnv();
