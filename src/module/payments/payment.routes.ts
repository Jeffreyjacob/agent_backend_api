import express, { Router } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { paymentController } from "../../container";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import { getPaymentSchema } from "./payment.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Stripe webhook and payment history
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     description: |
 *       Agents and buyers can view their own payment history.
 *       Filters by status, type, and date range.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCEEDED, FAILED, REFUNDED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *     responses:
 *       200:
 *         description: Payment history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [SUBSCRIPTION, FEATURED_LISTING]
 *                       status:
 *                         type: string
 *                         enum: [PENDING, SUCCEEDED, FAILED, REFUNDED]
 *                       amount:
 *                         type: number
 *                         example: 29.00
 *                       currency:
 *                         type: string
 *                         example: usd
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 message:
 *                   type: string
 *                   example: payments fetched
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.get(
  "/",
  authMiddleware,
  requireRole(Role.AGENT, Role.BUYER),
  Validate(getPaymentSchema, "query"),
  asyncHandler(paymentController.getPayments.bind(paymentController)),
);
/**
 * @swagger
 * /payments/webhook/stripe:
 *   post:
 *     summary: ⚠️ Stripe webhook receiver (Stripe use only)
 *     tags: [Payments]
 *     security: []
 *     description: |
 *       ⚠️ **This endpoint is called by Stripe automatically — do not call manually.**
 *
 *       Handles all Stripe payment events with full idempotency protection.
 *       Every event is stored in WebhookEvent table and processed exactly once.
 *
 *       **Events handled:**
 *       | Event | Action |
 *       |---|---|
 *       | `customer.subscription.created` | Sync subscription |
 *       | `customer.subscription.updated` | Update status/dates |
 *       | `customer.subscription.deleted` | Start 7-day grace period |
 *       | `invoice.paid` | Activate/renew, create PackageRecord |
 *       | `invoice.payment_failed` | Increment dunning counter, notify agent |
 *       | `customer.subscription.trial_will_end` | Send 3-day warning email |
 *       | `payment_intent.succeeded` | Activate featured listing (if metadata.type=featured_listing) |
 *       | `payment_intent.payment_failed` | Notify agent of failure |
 *
 *       **Error handling:**
 *       - Transient errors (DB down) → 500 → Stripe retries automatically
 *       - Permanent errors → 200 → stored as FAILED → admin can replay via /admin/webhooks/:id/replay
 *
 *       **Testing locally:**
 *       ```
 *       stripe listen --forward-to localhost:3000/api/v1/payments/webhook
 *       stripe trigger invoice.paid
 *       stripe trigger customer.subscription.deleted
 *       stripe trigger customer.subscription.trial_will_end
 *       ```
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: HMAC signature from Stripe for payload verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw Stripe event object
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *       400:
 *         description: Invalid signature
 *       500:
 *         description: Processing failed — Stripe will retry
 */

router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  asyncHandler(paymentController.handleWebhook.bind(paymentController)),
);

export default router;
