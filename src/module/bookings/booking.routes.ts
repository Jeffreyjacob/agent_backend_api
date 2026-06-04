import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import {
  cancelBookingSchema,
  createBookingSchema,
  getBookingSchema,
  rescheduleBookingSchema,
} from "./booking.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { bookingController } from "../../container";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Property viewing appointments
 */

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a viewing booking
 *     tags: [Bookings]
 *     description: |
 *       Buyer only.
 *
 *       **Conflict prevention:** Uses PostgreSQL advisory locks + SELECT FOR UPDATE
 *       to prevent double-booking under concurrent load.
 *
 *       **Auto-cancel:** Automatically cancelled if agent doesn't confirm within 48 hours.
 *
 *       **Viewing duration calculated as:**
 *       1. Property's `viewingDuration` (if set)
 *       2. Agent's `defaultViewingDuration` (fallback)
 *       3. System default: 60 minutes
 *
 *       **Email sent:** Agent receives notification of new booking request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propertyId, startTime]
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-07-15T14:00:00Z"
 *                 description: Must be in the future
 *               note:
 *                 type: string
 *                 example: Interested in parking availability
 *     responses:
 *       201:
 *         description: Booking created with PENDING status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: booking created successfully!
 *       400:
 *         description: Start time is in the past
 *       409:
 *         description: Time slot conflict — agent or buyer already has booking at this time
 */

router.post(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(createBookingSchema, "body"),
  asyncHandler(bookingController.createBooking.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/buyer:
 *   get:
 *     summary: Get buyer's bookings
 *     tags: [Bookings]
 *     description: Returns all bookings made by the authenticated buyer.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-07-01"
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
 *         description: Buyer bookings retrieved
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
 *                     $ref: '#/components/schemas/Booking'
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
 *                   example: buyer booking fetched
 */

router.get(
  "/buyer",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(getBookingSchema, "query"),
  asyncHandler(bookingController.getBuyerBookings.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/agent:
 *   get:
 *     summary: Get agent's bookings
 *     tags: [Bookings]
 *     description: Returns all bookings for the authenticated agent's properties.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Agent bookings retrieved
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
 *                     $ref: '#/components/schemas/Booking'
 *                 meta:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: Agent booking fetched!
 */

router.get(
  "/agent",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(getBookingSchema, "query"),
  asyncHandler(bookingController.getAgentBookings.bind(bookingController)),
);

router.get(
  "/:id",
  authMiddleware,
  asyncHandler(bookingController.getBookingById.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/{id}/confirm:
 *   patch:
 *     summary: Confirm a booking (agent only)
 *     tags: [Bookings]
 *     description: |
 *       Agent confirms a PENDING booking.
 *
 *       **On confirm:**
 *       - Status → CONFIRMED
 *       - 48-hour auto-cancel job removed
 *       - Confirmation email sent to buyer
 *       - Reminder emails scheduled 24 hours before viewing
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       400:
 *         description: Booking already confirmed or cancelled
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.patch(
  "/:id/confirm",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(bookingController.confirmBooking.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/{id}/completed:
 *   patch:
 *     summary: Mark booking as completed (agent only)
 *     tags: [Bookings]
 *     description: |
 *       Agent marks viewing as completed.
 *       Only allowed after `startTime` has passed.
 *       Booking must be CONFIRMED.
 *       Buyer can leave a review after this.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking marked as completed
 *       400:
 *         description: Booking not confirmed or viewing hasn't started yet
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.patch(
  "/:id/completed",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(bookingController.completeBooking.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/{id}/noShow:
 *   patch:
 *     summary: Mark buyer as no-show (agent only)
 *     tags: [Bookings]
 *     description: |
 *       Agent marks buyer as no-show.
 *       Only allowed after `startTime` has passed.
 *       Booking must be CONFIRMED.
 *       Email sent to buyer.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking marked as no-show
 *       400:
 *         description: Booking not confirmed or viewing hasn't started yet
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.patch(
  "/:id/noShow",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(bookingController.noShowBooking.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking (buyer or agent)
 *     tags: [Bookings]
 *     description: |
 *       Both buyer and agent can cancel PENDING or CONFIRMED bookings.
 *
 *       **On cancel:**
 *       - All scheduled BullMQ jobs removed
 *       - Email sent to the OTHER party
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelReason:
 *                 type: string
 *                 example: Schedule conflict
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Cannot cancel COMPLETED or NO_SHOW booking
 */

router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole(Role.AGENT, Role.BUYER),
  Validate(cancelBookingSchema, "body"),
  asyncHandler(bookingController.cancelBooking.bind(bookingController)),
);

/**
 * @swagger
 * /bookings/{id}/reschedule:
 *   patch:
 *     summary: Reschedule a booking (buyer only, before agent confirms)
 *     tags: [Bookings]
 *     description: |
 *       Only allowed while booking is PENDING.
 *       Once agent confirms, buyer must cancel and create new booking.
 *       Runs same conflict detection as creating a new booking.
 *       Old auto-cancel job is replaced with new 48-hour job.
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
 *             required: [startTime]
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-07-20T10:00:00Z"
 *     responses:
 *       200:
 *         description: Booking rescheduled
 *       400:
 *         description: Booking already confirmed — cannot reschedule
 *       409:
 *         description: New time slot has a conflict
 */

router.patch(
  "/:id",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(rescheduleBookingSchema, "body"),
  asyncHandler(bookingController.rescheduleBooking.bind(bookingController)),
);

export default router;
