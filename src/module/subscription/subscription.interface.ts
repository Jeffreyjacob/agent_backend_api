import {
  SubscriptionDuration,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

export enum SubscriptionSwitchEnum {
  NOW = "NOW",
  ENDOFCURRENTPLAN = "ENDOFCURRENTPLAN",
}

export interface ISetupIntentResponse {
  clientSecret: string;
  customerId: string;
}

export interface IConfirmSubscriptionIntentPayload {
  plan: SubscriptionPlan;
  durartion: SubscriptionDuration;
  setupIntentId: string;
}

export interface ISubscriptionResponse {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  price: number;
  usage: {
    propertiesUsed: number;
    maxProperties: number | null;
    featuredListingUsed: number;
    maxFeaturedListings: number;
  };
}

export interface ICancelSubscriptionPayload {
  cancelImmediately: boolean;
}

export interface IChangePlanPayload {
  newPlan: SubscriptionPlan;
  duration: SubscriptionDuration;
}
