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

router.post(
  "/",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  checkPropertyLimit,
  Validate(createPropertySchema, "body"),
  asyncHandler(propertiesController.createProperty.bind(propertiesController)),
);

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

router.get(
  "/:id",
  asyncHandler(propertiesController.getPropertyById.bind(propertiesController)),
);

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

router.post(
  "/:id/image",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  upload.array("images", 10),
  asyncHandler(propertiesController.uploadImage.bind(propertiesController)),
);

router.patch(
  "/:id/image/:imageId/primary",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  asyncHandler(
    propertiesController.setImageAsPrimary.bind(propertiesController),
  ),
);

router.delete(
  "/:id/image/:imageId",
  authMiddleware,
  requireRole(Role.AGENT),
  requiredActiveSubscription,
  asyncHandler(propertiesController.deleteImage.bind(propertiesController)),
);

export default router;
