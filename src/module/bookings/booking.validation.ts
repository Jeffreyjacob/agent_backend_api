import Joi, { ObjectSchema } from "joi";
import {
  BookingDurationEnum,
  ICancelBookingPayload,
  ICreateBookingPayload,
  IGetBookingPayload,
  IRescheduleBookingPayload,
} from "./booking.interface";
import { BookingStatus } from "@prisma/client";

export const createBookingSchema: ObjectSchema<ICreateBookingPayload> =
  Joi.object({
    propertyId: Joi.string().required(),
    startTime: Joi.string().required(),
    note: Joi.string().optional(),
  });

export const getBookingSchema: ObjectSchema<IGetBookingPayload> = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BookingStatus))
    .optional(),
  date: Joi.string().optional(),
  duration: Joi.string()
    .valid(...Object.values(BookingDurationEnum))
    .optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});

export const cancelBookingSchema: ObjectSchema<ICancelBookingPayload> =
  Joi.object({
    cancelReason: Joi.string().optional(),
  });

export const rescheduleBookingSchema: ObjectSchema<IRescheduleBookingPayload> =
  Joi.object({
    startTime: Joi.string().required(),
  });
