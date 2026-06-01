import express, { Router } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { paymentController } from "../../container";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import { getPaymentSchema } from "./payment.validation";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requireRole(Role.AGENT, Role.BUYER),
  Validate(getPaymentSchema, "query"),
  asyncHandler(paymentController.getPayments.bind(paymentController)),
);

router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  asyncHandler(paymentController.handleWebhook.bind(paymentController)),
);

export default router;
