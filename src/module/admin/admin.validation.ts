import Joi, { ObjectSchema } from "joi";
import {
  IGetBookingsQuery,
  IGetPaymentsQuery,
  IGetSubscriptionsQuery,
  IGetUserQuery,
  IGetWebhooksQuery,
} from "./admin.interface";
import {
  BookingStatus,
  PaymentStatus,
  PaymentType,
  PropertyStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { IGetPropertyQuery } from "../property/property.interface";

export const getUsersSchema: ObjectSchema<IGetUserQuery> = Joi.object({
  role: Joi.string()
    .valid(...Object.values(Role))
    .optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});

export const getPropertySchema: ObjectSchema<IGetPropertyQuery> = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PropertyStatus))
    .optional(),
  city: Joi.string().optional(),
  agentId: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});

export const getBookingsSchema: ObjectSchema<IGetBookingsQuery> = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BookingStatus))
    .optional(),
  agentId: Joi.string().optional(),
  buyerId: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});

export const getSubscriptionSchema: ObjectSchema<IGetSubscriptionsQuery> =
  Joi.object({
    status: Joi.string()
      .valid(...Object.values(SubscriptionStatus))
      .optional(),
    plan: Joi.string()
      .valid(...Object.values(SubscriptionPlan))
      .optional(),
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).optional(),
  });

export const getPaymentSchema: ObjectSchema<IGetPaymentsQuery> = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional(),
  type: Joi.string()
    .valid(...Object.values(PaymentType))
    .optional(),
  userId: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});

export const getWebhookSchema: ObjectSchema<IGetWebhooksQuery> = Joi.object({
  status: Joi.string().optional(),
  eventType: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});
