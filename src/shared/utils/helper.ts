import crypto from "crypto";
import { BookingDurationEnum } from "../../module/bookings/booking.interface";

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

export const getDateRange = (args: {
  date?: Date;
  duration: BookingDurationEnum;
}): { start: Date; end: Date } => {
  const today = args.date ? new Date(args.date) : new Date();

  let dateDuration: { start: Date; end: Date };
  switch (args.duration) {
    case BookingDurationEnum.Daily:
      dateDuration = {
        start: new Date(today.setHours(0, 0, 0, 0)),
        end: new Date(today.setHours(23, 59, 59, 999)),
      };
      break;

    case BookingDurationEnum.Weekly:
      const OneWeekAgo = new Date(today);
      OneWeekAgo.setDate(today.getDate() - 7);
      dateDuration = {
        start: OneWeekAgo,
        end: new Date(),
      };
      break;

    case BookingDurationEnum.Monthly:
      const startOfMonth = new Date(today);
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);
      dateDuration = {
        start: startOfMonth,
        end: new Date(),
      };
      break;

    default:
      dateDuration = {
        start: new Date(today.setHours(0, 0, 0, 0)),
        end: new Date(today.setHours(23, 59, 59, 999)),
      };
      break;
  }

  return dateDuration;
};
