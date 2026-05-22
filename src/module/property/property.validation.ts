import Joi, { ObjectSchema } from "joi";
import {
  ICreatePropertyPayload,
  IGetPropertyQuery,
  IUpdatePropertyPayload,
  PropertySortEnum,
} from "./property.interface";
import { PropertyCategory, PropertyStatus, PropertyType } from "@prisma/client";

export const createPropertySchema: ObjectSchema<ICreatePropertyPayload> =
  Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    type: Joi.string()
      .valid(...Object.values(PropertyType))
      .required(),
    category: Joi.string()
      .valid(...Object.values(PropertyCategory))
      .required(),
    price: Joi.number().min(0).required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    bedrooms: Joi.number().min(1).optional(),
    bathrooms: Joi.number().min(1).optional(),
    squareFootage: Joi.number().min(1).optional(),
    viewingDuration: Joi.number().min(15).max(90).optional(),
  });

export const updatePropertySchema: ObjectSchema<IUpdatePropertyPayload> =
  Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    price: Joi.number().min(0).optional(),
    status: Joi.string()
      .valid(...Object.values(PropertyStatus))
      .optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    bathrooms: Joi.number().min(1).optional(),
    bedrooms: Joi.number().min(1).optional(),
    squareFootage: Joi.number().min(1).optional(),
    viewingDuration: Joi.number().min(15).max(90).optional(),
  }).min(1);

export const getPropertySchema: ObjectSchema<IGetPropertyQuery> = Joi.object({
  price: Joi.object({
    min: Joi.number().min(1).optional(),
    max: Joi.number().optional(),
  })
    .min(1)
    .optional(),
  type: Joi.string()
    .valid(...Object.values(PropertyType))
    .optional(),
  category: Joi.string()
    .valid(...Object.values(PropertyCategory))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(PropertyStatus))
    .optional(),
  city: Joi.string().optional(),
  featured: Joi.boolean().optional(),
  agentId: Joi.string().optional(),
  minBedrooms: Joi.number().min(1).optional(),
  maxBedrooms: Joi.number().min(1).optional(),
  sort: Joi.string()
    .valid(...Object.values(PropertySortEnum))
    .optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
});
