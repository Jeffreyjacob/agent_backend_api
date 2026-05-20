import { Router } from "express";
import { Validate } from "../../middleware/validate";
import {
  forgetPasswordSchema,
  loginSchema,
  registerAgentSchema,
  registerBuyerSchema,
  resendEmailOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { authController } from "../../container";
import { authRateLimit } from "../../middleware/rateLimit";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.post(
  "/register/buyer",
  Validate(registerBuyerSchema, "body"),
  asyncHandler(authController.registerBuyer.bind(authController)),
);

router.post(
  "/register/agent",
  Validate(registerAgentSchema, "body"),
  asyncHandler(authController.registerAgent.bind(authController)),
);

router.post(
  "/login",
  authRateLimit,
  Validate(loginSchema, "body"),
  asyncHandler(authController.login.bind(authController)),
);

router.post(
  "/verifyEmail",
  Validate(verifyEmailSchema, "body"),
  asyncHandler(authController.verifyEmail.bind(authController)),
);

router.post(
  "/resendEmailOtp",
  Validate(resendEmailOtpSchema, "body"),
  authController.resendEmailOtp.bind(authController),
);

router.post(
  "/forgetPassword",
  authRateLimit,
  Validate(forgetPasswordSchema, "body"),
  asyncHandler(authController.forgetPassword.bind(authController)),
);

router.post(
  "/resetPassword",
  authRateLimit,
  Validate(resetPasswordSchema, "body"),
  asyncHandler(authController.resetPassword.bind(authController)),
);

router.post(
  "/refreshToken",
  asyncHandler(authController.refreshToken.bind(authController)),
);

router.post(
  "/logout",
  authMiddleware,
  asyncHandler(authController.logout.bind(authController)),
);

export default router;
