import { SubscriptionDuration, SubscriptionPlan } from "@prisma/client";
import { env } from "../../config/env";

export const PLAN_LIMITS: Record<
  SubscriptionPlan,
  {
    maxProperties: number | null;
    maxFeaturedListings: number;
    price: { MONTHLY: number; QUARTERLY: number; HALF_YEAR: number };
    trialDays: number;
  }
> = {
  BASIC: {
    maxProperties: 20,
    maxFeaturedListings: 2,
    price: { MONTHLY: 29, QUARTERLY: 79, HALF_YEAR: 149 },
    trialDays: 7,
  },
  PREMIUM: {
    maxProperties: null,
    maxFeaturedListings: 10,
    price: { MONTHLY: 79, QUARTERLY: 209, HALF_YEAR: 399 },
    trialDays: 14,
  },
};

export const PLAN_PRICES: Record<SubscriptionPlan, any> = {
  BASIC: {
    MONTHLY: env.STRIPE_BASIC_MONTHLY_PRICE_ID,
    QUARTERLY: env.STRIPE_BASIC_QUARTERLY_PRICE_ID,
    HALF_YEAR: env.STRIPE_BASIC_HALFYEAR_PRICE_ID,
  },
  PREMIUM: {
    MONTHLY: env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    QUARTERLY: env.STRIPE_PREMIUM_QUARTERLY_PRICE_ID,
    HALF_YEAR: env.STRIPE_PREMIUM_HALFYEAR_PRICE_ID,
  },
};

export const TRIAL_LIMIT: Record<
  SubscriptionPlan,
  {
    maxProperties: number;
    maxFeaturedListings: number;
  }
> = {
  BASIC: {
    maxProperties: 10,
    maxFeaturedListings: 0,
  },
  PREMIUM: {
    maxProperties: 15,
    maxFeaturedListings: 1,
  },
};
