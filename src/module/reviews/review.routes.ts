import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import { createReviewSchema, updateReviewSchema } from "./review.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { reviewController } from "../../container";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(createReviewSchema, "body"),
  asyncHandler(reviewController.createReview.bind(reviewController)),
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(updateReviewSchema, "body"),
  asyncHandler(reviewController.updateReview.bind(reviewController)),
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(reviewController.deleteReview.bind(reviewController)),
);

router.get(
  "/:propertyId/property",
  asyncHandler(reviewController.getPropertyReviews.bind(reviewController)),
);

export default router;
