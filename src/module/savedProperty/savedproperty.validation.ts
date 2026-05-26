import Joi, { ObjectSchema } from "joi";
import { IGetSavedPropertyPayload } from "./savedproperty.interface";

export const getSavedPropertySchema: ObjectSchema<IGetSavedPropertyPayload> =
  Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).optional(),
  });
