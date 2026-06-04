import { Router } from "express";
import { authMiddleware, requireRole } from "../../middleware/authMiddleware";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { userController } from "../../container";
import { Role } from "@prisma/client";
import { Validate } from "../../middleware/validate";
import {
  changePasswordSchema,
  updateAgentSchema,
  updateBuyerSchema,
} from "./user.validation";

const router = Router();

router.get(
  "/",
  authMiddleware,
  asyncHandler(userController.getUser.bind(userController)),
);

router.patch(
  "/changePassword",
  authMiddleware,
  requireRole(Role.AGENT, Role.BUYER),
  Validate(changePasswordSchema, "body"),
  asyncHandler(userController.changePassword.bind(userController)),
);

router.patch(
  "/buyer",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(updateBuyerSchema, "body"),
  asyncHandler(userController.updateBuyer.bind(userController)),
);

router.patch(
  "/agent",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(updateAgentSchema, "body"),
  asyncHandler(userController.updateAgent.bind(userController)),
);

export default router;
