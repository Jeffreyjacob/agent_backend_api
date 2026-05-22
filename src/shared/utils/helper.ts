import crypto from "crypto";

export const generateOtp = (): string => {
  const randomOtp = crypto.randomInt(100000, 999999);
  return String(randomOtp).padStart(6, "0");
};

export const generateToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const CacheKey = {
  Properties: "PROPERTIES",
  Property: "PROPERTY",
} as const;

export const generateCacheKeyWithQuery = (
  resource: string,
  query: Record<string, any>,
): string => {
  const filters = Object.entries(query)
    .map(([key, value]) => {
      return `${key}=${value}`;
    })
    .join(":");

  return `${resource}:${filters}`;
};
