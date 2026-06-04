import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import { createReviewSchema, updateReviewSchema } from "./review.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { reviewController } from "../../container";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Property reviews — buyers only
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a property review
 *     tags: [Reviews]
 *     description: |
 *       Buyer only. Requires a COMPLETED booking for the property.
 *
 *       **Business rules:**
 *       - Must have a COMPLETED booking for the property
 *       - The bookingId must belong to the authenticated buyer
 *       - One review per property per buyer
 *       - One review per booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propertyId, bookingId, rating, comment]
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 description: Must be your own COMPLETED booking
 *               rating:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 5
 *                 example: 4.5
 *               comment:
 *                 type: string
 *                 example: Great property, very spacious and well maintained
 *     responses:
 *       201:
 *         description: Review created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 *                 message:
 *                   type: string
 *                   example: Review created successfully
 *       400:
 *         description: Booking not completed or doesn't belong to you
 *       409:
 *         description: You already reviewed this property
 */

router.post(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(createReviewSchema, "body"),
  asyncHandler(reviewController.createReview.bind(reviewController)),
);

/**
 * @swagger
 * /reviews/{id}:
 *   patch:
 *     summary: Update a review (within 48 hours)
 *     tags: [Reviews]
 *     description: |
 *       Can only update within 48 hours of creating the review.
 *       After 48 hours the review is locked permanently.
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
 *             minProperties: 1
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Updated — even better than I first thought!
 *     responses:
 *       200:
 *         description: Review updated
 *       400:
 *         description: Review can only be updated within 48 hours of creation
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.patch(
  "/:id",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(updateReviewSchema, "body"),
  asyncHandler(reviewController.updateReview.bind(reviewController)),
);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete your review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Review deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.delete(
  "/:id",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(reviewController.deleteReview.bind(reviewController)),
);

/**
 * @swagger
 * /reviews/{propertyId}/property:
 *   get:
 *     summary: Get all reviews for a property
 *     tags: [Reviews]
 *     security: []
 *     description: Returns reviews with reviewer names and average rating.
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID to get reviews for
 *     responses:
 *       200:
 *         description: Property reviews retrieved
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           rating:
 *                             type: number
 *                           comment:
 *                             type: string
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     averageRating:
 *                       type: number
 *                       example: 4.3
 *                     totalReviews:
 *                       type: integer
 *                       example: 12
 *                 message:
 *                   type: string
 *                   example: reviews fetched
 */

router.get(
  "/:propertyId/property",
  asyncHandler(reviewController.getPropertyReviews.bind(reviewController)),
);

export default router;
