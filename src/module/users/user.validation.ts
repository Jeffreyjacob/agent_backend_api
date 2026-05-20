import Joi, { ObjectSchema } from "joi";
import {
  IChangePassword,
  IUpdateAgentPayload,
  IUpdateBuyerPayload,
} from "./user.interface";

export const updateBuyerSchema: ObjectSchema<IUpdateBuyerPayload> = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
}).min(1);

export const updateAgentSchema: ObjectSchema<IUpdateAgentPayload> = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  defaultViewingDuration: Joi.number().min(15).max(60),
}).min(1);

export const changePasswordSchema: ObjectSchema<IChangePassword> = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, number and special character",
    }),
});
