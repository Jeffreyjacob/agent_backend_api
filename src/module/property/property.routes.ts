import { Router } from "express";
import {
  authMiddleware,
  checkFeaturedListingLimit,
  checkPropertyLimit,
  requiredActiveSubscription,
  requireRole,
} from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import {
  createPropertySchema,
  getFeaturedListingSchema,
  getPropertySchema,
  updatePropertySchema,
} from "./property.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { propertiesController } from "../../container";
import { upload } from "../../middleware/multer";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property listings — create, search, manage
 */

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Create a new property listing
 *     tags: [Properties]
 *     description: |
 *       Agent only. Requires active subscription and available property slots.
 *       Property starts in **DRAFT** status and is not visible to buyers.
 *       Publish by updating status to ACTIVE (requires at least 1 image).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, category, price, address, city, state, country]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Luxury 3 Bedroom Apartment in Lekki
 *               description:
 *                 type: string
 *                 example: Stunning modern apartment with ocean views
 *               type:
 *                 type: string
 *                 enum: [FOR_SALE, FOR_RENT]
 *               category:
 *                 type: string
 *                 enum: [APARTMENT, HOUSE, DUPLEX, LAND, COMMERCIAL, WAREHOUSE]
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 85000000
 *               address:
 *                 type: string
 *                 example: 15 Admiralty Way
 *               city:
 *                 type: string
 *                 example: Lagos
 *               state:
 *                 type: string
 *                 example: Lagos
 *               country:
 *                 type: string
 *                 example: Nigeria
 *               latitude:
 *                 type: number
 *                 example: 6.4281
 *               longitude:
 *                 type: number
 *                 example: 3.4219
 *               bedrooms:
 *                 type: integer
 *                 example: 3
 *               bathrooms:
 *                 type: integer
 *                 example: 2
 *               squareFootage:
 *                 type: number
 *                 example: 180
 *               viewingDuration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 90
 *                 example: 45
 *                 description: Override agent's default viewing duration (minutes)
 *     responses:
 *       201:
 *         description: Property created in DRAFT status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *                 message:
 *                   type: string
 *                   example: Property created successfully!
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: |
 *           No active subscription OR property limit reached for this billing cycle
 *       409:
 *         description: Property already listed at this address
 */

router.post(
  "/",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  checkPropertyLimit,
  Validate(createPropertySchema, "body"),
  asyncHandler(propertiesController.createProperty.bind(propertiesController)),
);

/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Search and filter properties
 *     tags: [Properties]
 *     security: []
 *     description: |
 *       Public endpoint. Results cached for 5 minutes.
 *       Featured properties always appear first when sort=Featured_First.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [FOR_SALE, FOR_RENT]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [APARTMENT, HOUSE, DUPLEX, LAND, COMMERCIAL, WAREHOUSE]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         example: Lagos
 *       - in: query
 *         name: price[min]
 *         schema:
 *           type: number
 *         example: 50000000
 *       - in: query
 *         name: price[max]
 *         schema:
 *           type: number
 *         example: 150000000
 *       - in: query
 *         name: minBedrooms
 *         schema:
 *           type: integer
 *         example: 2
 *       - in: query
 *         name: maxBedrooms
 *         schema:
 *           type: integer
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [PriceAsc, PriceDsc, DateDsc, Featured_First]
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Properties retrieved
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
 *                     $ref: '#/components/schemas/Property'
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
 *                   example: properties fetched
 */

router.get(
  "/",
  Validate(getPropertySchema, "query"),
  asyncHandler(propertiesController.getProperties.bind(propertiesController)),
);

router.get(
  "/featuredListing",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(getFeaturedListingSchema, "query"),
  asyncHandler(
    propertiesController.getFeaturedListings.bind(propertiesController),
  ),
);

/**
 * @swagger
 * /properties/{id}/feature:
 *   post:
 *     summary: ⚠️ Create payment to feature a property ($19)
 *     tags: [Properties]
 *     description: |
 *       ⚠️ **Cannot be tested in Swagger UI** — requires Stripe.js on frontend.
 *
 *       Creates a Stripe PaymentIntent for featuring a property.
 *
 *       **Frontend flow:**
 *       1. Call this endpoint → get `clientSecret`
 *       2. `stripe.confirmCardPayment(clientSecret)` via Stripe.js
 *       3. Property is featured automatically via `payment_intent.succeeded` webhook
 *
 *       **What featured means:**
 *       - Appears at top of search results
 *       - Featured badge shown to buyers
 *       - Lasts 30 days then automatically removed
 *
 *       **Test card:** 4242 4242 4242 4242
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PaymentIntent created
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
 *                       description: Pass to Stripe.js — never log or store
 *                     paymentIntentId:
 *                       type: string
 *                       description: Reference ID for this payment
 *                     amount:
 *                       type: number
 *                       example: 19
 *                     currency:
 *                       type: string
 *                       example: usd
 *                 message:
 *                   type: string
 *                   example: Payment intent created
 *       403:
 *         description: No active subscription
 *       409:
 *         description: Property is already featured
 */

router.post(
  "/featuredListing/:propertyId",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  checkFeaturedListingLimit,
  asyncHandler(
    propertiesController.createFeaturedListing.bind(propertiesController),
  ),
);

/**
 * @swagger
 * /properties/{id}:
 *   get:
 *     summary: Get property details
 *     tags: [Properties]
 *     security: []
 *     description: Returns property with images, reviews, and agent info. Result cached for 5 minutes.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *                 message:
 *                   type: string
 *                   example: property fetched
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.get(
  "/:id",
  asyncHandler(propertiesController.getPropertyById.bind(propertiesController)),
);

/**
 * @swagger
 * /properties/{id}:
 *   patch:
 *     summary: Update property details or status
 *     tags: [Properties]
 *     description: |
 *       Agent (own properties) or Admin.
 *
 *       **Status transitions:**
 *       - DRAFT → ACTIVE (requires at least 1 image)
 *       - ACTIVE → PENDING, SOLD, RENTED, INACTIVE
 *       - PENDING → ACTIVE, INACTIVE, SOLD, RENTED
 *       - INACTIVE → ACTIVE
 *       - SOLD/RENTED → terminal (cannot change)
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
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, PENDING, SOLD, RENTED, INACTIVE]
 *               bedrooms:
 *                 type: integer
 *               bathrooms:
 *                 type: integer
 *               viewingDuration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Property updated
 *       400:
 *         description: Invalid status transition or no images to publish
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.patch(
  "/:id",
  authMiddleware,
  requireRole(Role.AGENT, Role.ADMIN),
  requiredActiveSubscription,
  Validate(updatePropertySchema, "body"),
  asyncHandler(propertiesController.updateProperty.bind(propertiesController)),
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole(Role.AGENT, Role.ADMIN),
  requiredActiveSubscription,
  asyncHandler(propertiesController.deleteProperty.bind(propertiesController)),
);

/**
 * @swagger
 * /properties/{id}/image:
 *   post:
 *     summary: Upload images for a property
 *     tags: [Properties]
 *     description: |
 *       Accepts up to 10 images (5MB each).
 *       Images are uploaded asynchronously via BullMQ — response is immediate.
 *       First upload automatically sets the first image as primary.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images queued for upload
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 propertyId: uuid-here
 *               message: Images are being uploaded
 *       400:
 *         description: No files provided
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.post(
  "/:id/image",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  upload.array("images", 10),
  asyncHandler(propertiesController.uploadImage.bind(propertiesController)),
);

/**
 * @swagger
 * /properties/{id}/image/{imageId}/primary:
 *   patch:
 *     summary: Set an image as the primary (thumbnail) image
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Primary image updated
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.patch(
  "/:id/image/:imageId/primary",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  asyncHandler(
    propertiesController.setImageAsPrimary.bind(propertiesController),
  ),
);

/**
 * @swagger
 * /properties/{id}/image/{imageId}:
 *   delete:
 *     summary: Delete a property image
 *     tags: [Properties]
 *     description: Deletes from database and Cloudinary.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Image deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.delete(
  "/:id/image/:imageId",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  asyncHandler(propertiesController.deleteImage.bind(propertiesController)),
);

export default router;
