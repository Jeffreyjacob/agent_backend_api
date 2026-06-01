import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { subscriptionController } from "../../container";
import { Validate } from "../../middleware/validate";
import {
  cancelSubscriptionSchema,
  changePlanPayloadSchema,
  confirmSubscriptionSchema,
  paymentMethodSchema,
  restartSubscriptionSchema,
} from "./subscription.validation";

export const router = Router();

router.post(
  "/setupIntent",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(subscriptionController.setupIntent.bind(subscriptionController)),
);

router.post(
  "/confirmSubscriptionTrial",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(confirmSubscriptionSchema, "body"),
  asyncHandler(
    subscriptionController.confirmSubscriptionTrial.bind(
      subscriptionController,
    ),
  ),
);

router.post(
  "/reSubscribe",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(restartSubscriptionSchema, "body"),
  asyncHandler(subscriptionController.resubscribe.bind(subscriptionController)),
);

router.get(
  "/",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.getSubscription.bind(subscriptionController),
  ),
);

router.post(
  "/cancel",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(cancelSubscriptionSchema, "body"),
  asyncHandler(
    subscriptionController.cancelSubscription.bind(subscriptionController),
  ),
);

router.post(
  "/resume",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.resumeSubscription.bind(subscriptionController),
  ),
);

router.post(
  "/changePlan",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(changePlanPayloadSchema, "body"),
  asyncHandler(subscriptionController.changePlan.bind(subscriptionController)),
);

router.post(
  "/paymentMethod/initiate",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.initiatePaymentMethod.bind(subscriptionController),
  ),
);

router.post(
  "/paymentMethod/confirm",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(paymentMethodSchema, "body"),
  asyncHandler(
    subscriptionController.confirmAddPaymentMethod.bind(subscriptionController),
  ),
);

router.patch(
  "/paymentMethod/default",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(paymentMethodSchema, "body"),
  asyncHandler(
    subscriptionController.setDefaultPaymentMethod.bind(subscriptionController),
  ),
);

router.delete(
  "/paymentMethod",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(paymentMethodSchema, "body"),
  asyncHandler(
    subscriptionController.deletePaymentMethod.bind(subscriptionController),
  ),
);

router.get(
  "/paymentMethod",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.getCustomerCards.bind(subscriptionController),
  ),
);

export default router;
