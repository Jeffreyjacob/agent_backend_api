import Joi, { ObjectSchema } from "joi";
import { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface";

export const createReviewSchema: ObjectSchema<ICreateReviewPayload> =
  Joi.object({
    propertyId: Joi.string().required(),
    bookingId: Joi.string().required(),
    rating: Joi.number().min(0.5).max(5).required(),
    comment: Joi.string().required(),
  });

export const updateReviewSchema: ObjectSchema<IUpdateReviewPayload> =
  Joi.object({
    rating: Joi.number().min(0.5).max(5).optional(),
    comment: Joi.string().optional(),
  }).min(1);
