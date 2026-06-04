import Joi, { ObjectSchema } from "joi";
import {
  IAgentRegisterPayload,
  IBuyerRegistrationPayload,
  IForgetPasswordPayload,
  ILoginPayload,
  IResendOtpPayload,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface";

export const registerBuyerSchema: ObjectSchema<IBuyerRegistrationPayload> =
  Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain uppercase, number and special character",
      }),
  });

export const registerAgentSchema: ObjectSchema<IAgentRegisterPayload> =
  Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain uppercase, number and special character",
      }),
  });

export const loginSchema: ObjectSchema<ILoginPayload> = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

export const verifyEmailSchema: ObjectSchema<IVerifyEmailPayload> = Joi.object({
  email: Joi.string().required(),
  otp: Joi.string().min(6).required(),
});

export const resendEmailOtpSchema: ObjectSchema<IResendOtpPayload> = Joi.object(
  {
    email: Joi.string().required(),
  },
);

export const forgetPasswordSchema: ObjectSchema<IForgetPasswordPayload> =
  Joi.object({
    email: Joi.string().required(),
  });

export const resetPasswordSchema: ObjectSchema<IResetPasswordPayload> =
  Joi.object({
    resetToken: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain uppercase, number and special character",
      }),
  });
