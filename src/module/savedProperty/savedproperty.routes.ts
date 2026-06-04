import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { savedPropertyController } from "../../container";
import { Validate } from "../../middleware/validate";
import { getSavedPropertySchema } from "./savedproperty.validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Saved Properties
 *   description: Buyer's saved/favourited properties
 */

/**
 * @swagger
 * /saved:
 *   get:
 *     summary: Get buyer's saved properties
 *     tags: [Saved Properties]
 *     description: Returns list of saved properties with basic property details.
 *     parameters:
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
 *         description: Saved properties retrieved
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
 *                         description: SavedProperty record ID
 *                       property:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           price:
 *                             type: number
 *                           city:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [FOR_SALE, FOR_RENT]
 *                           category:
 *                             type: string
 *                           status:
 *                             type: string
 *                           primaryImage:
 *                             type: string
 *                             nullable: true
 *                             description: URL of primary image
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: When the property was saved
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
 *                   example: saved properties fetched
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.get(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(getSavedPropertySchema, "query"),
  asyncHandler(
    savedPropertyController.getSavedList.bind(savedPropertyController),
  ),
);

/**
 * @swagger
 * /saved/{propertyId}:
 *   post:
 *     summary: Save a property to favourites
 *     tags: [Saved Properties]
 *     description: |
 *       Only ACTIVE properties can be saved.
 *       One save per property per buyer — duplicate saves return 409.
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the property to save
 *     responses:
 *       201:
 *         description: Property saved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: uuid
 *                 userId: uuid
 *                 propertyId: uuid
 *                 createdAt: "2026-07-01T10:00:00Z"
 *               message: property saved successfully
 *       400:
 *         description: Cannot save DRAFT or INACTIVE property
 *       404:
 *         description: Property not found
 *       409:
 *         description: Property already in saved list
 */

router.post(
  "/:propertyId",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(
    savedPropertyController.addSavedProperty.bind(savedPropertyController),
  ),
);

/**
 * @swagger
 * /saved/{propertyId}:
 *   delete:
 *     summary: Remove a property from favourites
 *     tags: [Saved Properties]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Property removed from saved list
 *       404:
 *         description: Property not in saved list
 */

router.delete(
  "/:propertyId",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(
    savedPropertyController.removeSavedProperty.bind(savedPropertyController),
  ),
);

export default router;
