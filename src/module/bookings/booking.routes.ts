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

router.post(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(createBookingSchema, "body"),
  asyncHandler(bookingController.createBooking.bind(bookingController)),
);

router.get(
  "/buyer",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(getBookingSchema, "query"),
  asyncHandler(bookingController.getBuyerBookings.bind(bookingController)),
);

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

router.patch(
  "/:id/confirm",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(bookingController.confirmBooking.bind(bookingController)),
);

router.patch(
  "/:id/completed",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(bookingController.completeBooking.bind(bookingController)),
);

router.patch(
  "/:id/noShow",
  authMiddleware,
  requireRole(Role.AGENT),
  asyncHandler(bookingController.noShowBooking.bind(bookingController)),
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole(Role.AGENT, Role.BUYER),
  Validate(cancelBookingSchema, "body"),
  asyncHandler(bookingController.cancelBooking.bind(bookingController)),
);

router.patch(
  "/:id/reschedule",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(rescheduleBookingSchema, "body"),
  asyncHandler(bookingController.rescheduleBooking.bind(bookingController)),
);

export default router;
