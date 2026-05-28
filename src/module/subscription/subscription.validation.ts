import Joi, { ObjectSchema } from "joi";
import {
  ICancelSubscriptionPayload,
  IChangePlanPayload,
  IConfirmSubscriptionIntentPayload,
} from "./subscription.interface";
import { SubscriptionDuration, SubscriptionPlan } from "@prisma/client";

export const confirmSubscriptionSchema: ObjectSchema<IConfirmSubscriptionIntentPayload> =
  Joi.object({
    setupIntentId: Joi.string().required(),
    plan: Joi.string()
      .valid(...Object.values(SubscriptionPlan))
      .required(),
    durartion: Joi.string()
      .valid(...Object.values(SubscriptionDuration))
      .required(),
  });

export const cancelSubscriptionSchema: ObjectSchema<ICancelSubscriptionPayload> =
  Joi.object({
    cancelImmediately: Joi.boolean().required(),
  });

export const changePlanPayloadSchema: ObjectSchema<IChangePlanPayload> =
  Joi.object({
    newPlan: Joi.string()
      .valid(...Object.values(SubscriptionPlan))
      .required(),
    duration: Joi.string()
      .valid(...Object.values(SubscriptionDuration))
      .required(),
  });
