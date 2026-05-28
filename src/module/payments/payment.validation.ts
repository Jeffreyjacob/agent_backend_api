import Joi, { ObjectSchema } from "joi";
import { IGetPaymentPayload } from "./payment.interface";
import { PaymentStatus } from "@prisma/client";
import { BookingDurationEnum } from "../bookings/booking.interface";

export const getPaymentSchema: ObjectSchema<IGetPaymentPayload> = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
  status: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional(),
  date: Joi.string().optional(),
  duration: Joi.string()
    .valid(...Object.values(BookingDurationEnum))
    .optional(),
});
