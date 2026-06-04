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

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Platform management — Admin role required
 */

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

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     tags: [Admin]
 *     description: |
 *       Deactivating an AGENT also deactivates all their property listings.
 *       Cannot deactivate other ADMIN accounts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: User status updated
 *       400:
 *         description: Cannot deactivate admin accounts
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

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

/**
 * @swagger
 * /admin/webhooks/{eventId}/replay:
 *   post:
 *     summary: Replay a failed webhook event
 *     tags: [Admin]
 *     description: |
 *       Replays a FAILED webhook event through the same handler.
 *       Idempotency protection prevents double-processing.
 *
 *       **Use when:**
 *       - Agent paid but subscription wasn't activated
 *       - Featured listing wasn't enabled after payment
 *       - Any FAILED webhook in /admin/webhooks list
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe event ID from the webhook record
 *         example: evt_1ABC123def456
 *     responses:
 *       200:
 *         description: Webhook replayed successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: Webhook replayed successfully
 *       400:
 *         description: Webhook already processed — cannot replay
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.post(
  "/webhooks/:eventId/replay",
  asyncHandler(adminController.replayWebhook.bind(adminController)),
);

router.delete(
  "/webhooks/:eventId",
  asyncHandler(adminController.deleteWebhook.bind(adminController)),
);

/**
 * @swagger
 * /admin/analytics/overview:
 *   get:
 *     summary: Platform analytics overview
 *     tags: [Admin]
 *     description: |
 *       All queries run in parallel via Promise.all for performance.
 *       Returns snapshot of entire platform health.
 *     responses:
 *       200:
 *         description: Platform overview metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 1250
 *                     totalAgents:
 *                       type: integer
 *                       example: 180
 *                     totalBuyers:
 *                       type: integer
 *                       example: 1070
 *                     totalProperties:
 *                       type: integer
 *                       example: 450
 *                     activeProperties:
 *                       type: integer
 *                       example: 312
 *                     totalBookings:
 *                       type: integer
 *                       example: 890
 *                     completedBookings:
 *                       type: integer
 *                       example: 234
 *                     totalRevenue:
 *                       type: number
 *                       example: 45230.50
 *                     monthlyRevenue:
 *                       type: number
 *                       example: 8420.00
 *                     activeSubscriptions:
 *                       type: integer
 *                       example: 145
 *                     trialingSubscriptions:
 *                       type: integer
 *                       example: 23
 *                     failedWebhooks:
 *                       type: integer
 *                       example: 2
 *                 message:
 *                   type: string
 *                   example: overview fetched
 */

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
