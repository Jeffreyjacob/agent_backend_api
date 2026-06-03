import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import {
  getBookingsSchema,
  getPaymentSchema,
  getPropertySchema,
  getSubscriptionSchema,
  getUsersSchema,
  getWebhookSchema,
} from "./admin.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { adminController } from "../../container";
import { bullboardRouter } from "../../jobs/bullBoard";

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

router.get(
  "/users",
  Validate(getUsersSchema, "query"),
  asyncHandler(adminController.getUsers.bind(adminController)),
);

router.get(
  "/users/:id",
  asyncHandler(adminController.getUserById.bind(adminController)),
);

router.patch(
  "/users/:id/status",
  asyncHandler(adminController.updateUserStatus.bind(adminController)),
);

router.get(
  "/properties",
  Validate(getPropertySchema, "query"),
  asyncHandler(adminController.getProperties.bind(adminController)),
);
router.patch(
  "/properties/:id/status",
  asyncHandler(adminController.updatePropertyStatus.bind(adminController)),
);

router.get(
  "/bookings",
  Validate(getBookingsSchema, "query"),
  asyncHandler(adminController.getBookings.bind(adminController)),
);

router.get(
  "/subscriptions",
  Validate(getSubscriptionSchema, "query"),
  asyncHandler(adminController.getSubscriptions.bind(adminController)),
);

router.get(
  "/payments",
  Validate(getPaymentSchema, "query"),
  asyncHandler(adminController.getPayments.bind(adminController)),
);

router.get(
  "/webhooks",
  Validate(getWebhookSchema, "query"),
  asyncHandler(adminController.getWebhooks.bind(adminController)),
);

router.post(
  "/webhooks/:eventId/replay",
  asyncHandler(adminController.replayWebhook.bind(adminController)),
);

router.delete(
  "/webhooks/:eventId",
  asyncHandler(adminController.deleteWebhook.bind(adminController)),
);

router.get(
  "/analytics/overview",
  asyncHandler(adminController.getOverview.bind(adminController)),
);

router.get(
  "/analytics/revenue",
  asyncHandler(adminController.getRevenueAnalytics.bind(adminController)),
);

router.use("/queues", bullboardRouter);

export default router;
