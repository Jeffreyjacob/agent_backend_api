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

/**
 * @swagger
 * /subscriptions/resubscribe:
 *   post:
 *     summary: Resubscribe after cancellation (no trial)
 *     tags: [Subscriptions]
 *     description: |
 *       For agents whose subscription was previously cancelled.
 *       **No free trial** — charged immediately.
 *
 *       Requires a saved payment method from a previous subscription.
 *       If no payment method exists, call POST /payment-methods/initiate first.
 *
 *       **On resubscription:**
 *       - Subscription status → ACTIVE immediately
 *       - All INACTIVE listings reactivated
 *       - Welcome back email sent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan, duration]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [BASIC, PREMIUM]
 *               duration:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, HALF_YEAR]
 *     responses:
 *       200:
 *         description: Subscription reactivated — charged immediately
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
 *                   example: Subscription reactivated successfully
 *       400:
 *         description: No saved payment method found
 *       409:
 *         description: Already have an active subscription
 */

router.post(
  "/resubscribe",
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

/**
 * @swagger
 * /subscriptions/resume:
 *   post:
 *     summary: Resume a subscription scheduled for cancellation
 *     tags: [Subscriptions]
 *     description: |
 *       If you cancelled with `cancelImmediately: false`, the subscription
 *       is still active until period end but marked for cancellation.
 *
 *       This endpoint removes the cancellation — subscription continues normally.
 *     responses:
 *       200:
 *         description: Subscription resumed
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: Subscription resumed successfully
 *       400:
 *         description: Subscription is not scheduled for cancellation
 *       404:
 *         description: No subscription found
 */

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

/**
 * @swagger
 * /subscriptions/payment-methods/initiate:
 *   post:
 *     summary: ⚠️ Create SetupIntent to add a new card
 *     tags: [Payment Methods]
 *     description: |
 *       ⚠️ **Cannot be tested in Swagger UI** — requires Stripe.js on frontend.
 *
 *       Step 1 of adding a new card. Returns a `clientSecret` for Stripe.js.
 *
 *       **Frontend flow:**
 *       ```
 *       Step 1: POST /payment-methods/initiate → get clientSecret
 *       Step 2: stripe.confirmCardSetup(clientSecret, { payment_method: { card } })
 *       Step 3: POST /payment-methods/confirm { paymentMethodId }
 *       ```
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
 *                     requiresPaymentMethod:
 *                       type: boolean
 *                       description: True if no payment method exists yet
 *                     paymentMethod:
 *                       type: string
 *                       nullable: true
 *                       description: Existing default payment method ID if present
 *                 message:
 *                   type: string
 *                   example: Setup intent created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

router.post(
  "/payment-methods/initiate",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.initiatePaymentMethod.bind(subscriptionController),
  ),
);

/**
 * @swagger
 * /subscriptions/payment-methods/confirm:
 *   post:
 *     summary: ⚠️ Confirm and save a new card
 *     tags: [Payment Methods]
 *     description: |
 *       ⚠️ **Call after Stripe.js confirmCardSetup() succeeds.**
 *
 *       Attaches the payment method to the Stripe Customer.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethodId]
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID from Stripe.js after card confirmed
 *                 example: pm_1ABC123def456
 *     responses:
 *       200:
 *         description: Card saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *                 message:
 *                   type: string
 *                   example: Payment method added successfully
 *       400:
 *         description: Invalid payment method ID
 */

router.post(
  "/payment-methods/confirm",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(paymentMethodSchema, "body"),
  asyncHandler(
    subscriptionController.confirmAddPaymentMethod.bind(subscriptionController),
  ),
);

/**
 * @swagger
 * /subscriptions/payment-methods/{id}/default:
 *   patch:
 *     summary: Set a card as the default payment method
 *     tags: [Payment Methods]
 *     description: |
 *       Sets the card as default for future subscription renewals.
 *       Only one card can be default at a time.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment method ID
 *         example: pm_1ABC123def456
 *     responses:
 *       200:
 *         description: Default payment method updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: Default payment method updated
 *       404:
 *         description: Payment method not found
 */

router.patch(
  "/payment-methods/:id/default",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.setDefaultPaymentMethod.bind(subscriptionController),
  ),
);

/**
 * @swagger
 * /subscriptions/payment-methods/{id}:
 *   delete:
 *     summary: Delete a saved card
 *     tags: [Payment Methods]
 *     description: |
 *       **Business rules:**
 *       - Cannot delete the default payment method if subscription is active
 *         (set another card as default first)
 *       - Cannot delete your only card if subscription is active
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment method ID
 *         example: pm_1ABC123def456
 *     responses:
 *       204:
 *         description: Card deleted
 *       400:
 *         description: |
 *           Cannot delete default card with active subscription,
 *           or cannot delete only card with active subscription
 *       404:
 *         description: Payment method not found
 */

router.delete(
  "/payment-methods/:id",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.deletePaymentMethod.bind(subscriptionController),
  ),
);

/**
 * @swagger
 *  /subscriptions/payment-methods:
 *   get:
 *     summary: List all saved cards
 *     tags: [Payment Methods]
 *     description: Returns all saved payment methods for the agent.
 *     responses:
 *       200:
 *         description: Payment methods retrieved
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
 *                     $ref: '#/components/schemas/PaymentMethod'
 *                 message:
 *                   type: string
 *                   example: Payment methods fetched
 */

router.get(
  "/payment-methods",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(
    subscriptionController.getCustomerCards.bind(subscriptionController),
  ),
);

export default router;
