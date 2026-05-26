import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { savedPropertyController } from "../../container";
import { Validate } from "../../middleware/validate";
import { getSavedPropertySchema } from "./savedproperty.validation";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(
    savedPropertyController.addSavedProperty.bind(savedPropertyController),
  ),
);
router.get(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(getSavedPropertySchema, "query"),
  asyncHandler(
    savedPropertyController.getSavedList.bind(savedPropertyController),
  ),
);

router.delete(
  "/",
  authMiddleware,
  requireRole(Role.BUYER),
  asyncHandler(
    savedPropertyController.removeSavedProperty.bind(savedPropertyController),
  ),
);

export default router;
