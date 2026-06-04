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

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Agent subscription management
 */

/**
 * @swagger
 * /subscriptions/setup-intent:
 *   post:
 *     summary: ⚠️ Create SetupIntent to collect card details
 *     tags: [Subscriptions]
 *     description: |
 *       ⚠️ **Cannot be tested in Swagger UI** — requires Stripe.js on frontend.
 *
 *       Step 1 of subscription flow. Creates a Stripe SetupIntent.
 *
 *       **Complete frontend flow:**
 *       ```
 *       Step 1: POST /subscriptions/setup-intent → get clientSecret
 *       Step 2: stripe.confirmCardSetup(clientSecret, { payment_method: { card } })
 *       Step 3: POST /subscriptions/confirm { plan, setupIntentId, duration }
 *       ```
 *
 *       On first call, creates a Stripe Customer and saves stripeCustomerId to agent profile.
 *
 *       **Test cards:**
 *       - 4242 4242 4242 4242 — Success
 *       - 4000 0025 0000 3155 — Requires authentication
 *     responses:
 *       200:
 *         description: SetupIntent created
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
 *                     clientSecret:
 *                       type: string
 *                       description: Pass to Stripe.js confirmCardSetup(). Never store.
 *                       example: seti_1ABC_secret_xyz
 *                     customerId:
 *                       type: string
 *                       example: cus_1ABC123
 *                 message:
 *                   type: string
 *                   example: Setup intent created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Agent already has an active subscription
 */

router.post(
  "/setup-intent",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(subscriptionController.setupIntent.bind(subscriptionController)),
);

/**
 * @swagger
 * /subscriptions/confirm:
 *   post:
 *     summary: ⚠️ Confirm subscription after card setup
 *     tags: [Subscriptions]
 *     description: |
 *       ⚠️ **Requires successful Stripe.js card setup first.**
 *
 *       Step 3 of subscription flow. Call after Stripe.js confirms the card.
 *
 *       **What happens:**
 *       1. Verifies SetupIntent was completed
 *       2. Creates Stripe subscription with **14-day free trial**
 *       3. Card is charged automatically after trial
 *       4. Welcome email sent
 *       5. Trial ending reminder scheduled (3 days before end)
 *
 *       **Plans:**
 *       | Plan | Monthly | Properties | Featured |
 *       |---|---|---|---|
 *       | BASIC | $29 | 20 | 2/month |
 *       | PREMIUM | $79 | Unlimited | 10/month |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan, setupIntentId, duration]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [BASIC, PREMIUM]
 *               setupIntentId:
 *                 type: string
 *                 description: SetupIntent ID from Stripe after card confirmed
 *                 example: seti_1ABC123def456
 *               duration:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, HALF_YEAR]
 *     responses:
 *       200:
 *         description: Subscription created with 14-day trial
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subscription'
 *                 message:
 *                   type: string
 *                   example: Subscription created successfully
 *       400:
 *         description: Card setup not completed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.post(
  "/confirm",
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

/**
 * @swagger
 * /subscriptions/my:
 *   get:
 *     summary: Get current subscription and usage
 *     tags: [Subscriptions]
 *     description: Returns subscription details with current billing cycle usage.
 *     responses:
 *       200:
 *         description: Subscription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subscription'
 *                 message:
 *                   type: string
 *                   example: Subscription fetched
 *       404:
 *         description: No subscription found
 */

router.get(
  "/my",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.getSubscription.bind(subscriptionController),
  ),
);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     description: |
 *       Two cancellation modes:
 *
 *       **Immediate** (`cancelImmediately: true`):
 *       - Access lost immediately
 *       - All listings set to INACTIVE
 *       - Prorated refund may apply (Stripe handles this)
 *
 *       **End of period** (`cancelImmediately: false`):
 *       - Access continues until billing period ends
 *       - Listings remain active until period ends
 *       - No refund
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cancelImmediately]
 *             properties:
 *               cancelImmediately:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cancellation processed
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: Subscription will be cancelled at the end of your billing period
 */

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

/**
 * @swagger
 * /subscriptions/plan:
 *   patch:
 *     summary: Upgrade or downgrade subscription plan
 *     tags: [Subscriptions]
 *     description: |
 *       Changes the subscription plan immediately with Stripe proration.
 *
 *       **Upgrade (BASIC → PREMIUM):**
 *       - Immediate access to PREMIUM features
 *       - Prorated charge for remaining period
 *
 *       **Downgrade (PREMIUM → BASIC):**
 *       - Excess properties deactivated (oldest first) if over new limit
 *       - Effective immediately
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPlan]
 *             properties:
 *               newPlan:
 *                 type: string
 *                 enum: [BASIC, PREMIUM]
 *     responses:
 *       200:
 *         description: Plan changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Already on this plan
 */

router.patch(
  "/plan",
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
