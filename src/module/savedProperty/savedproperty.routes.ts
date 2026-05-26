import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { savedPropertyController } from "../../container";
import { Validate } from "../../middleware/validate";
import { getSavedPropertySchema } from "./savedproperty.validation";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(getSavedPropertySchema, "query"),
  asyncHandler(
    savedPropertyController.getSavedList.bind(savedPropertyController),
  ),
);

router.post(
  "/:propertyId",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(
    savedPropertyController.addSavedProperty.bind(savedPropertyController),
  ),
);

router.delete(
  "/:propertyId",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(
    savedPropertyController.removeSavedProperty.bind(savedPropertyController),
  ),
);

export default router;
