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

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get own profile
 *     tags: [Users]
 *     description: Returns the authenticated user's profile details.
 *     responses:
 *       200:
 *         description: Profile retrieved
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
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [BUYER, AGENT, ADMIN]
 *                     defaultViewingDuration:
 *                       type: integer
 *                       nullable: true
 *                       description: Agent only
 *                     isActive:
 *                       type: boolean
 *                 message:
 *                   type: string
 *                   example: User fetched
 */

router.get(
  "/me",
  authMiddleware,
  asyncHandler(userController.getUser.bind(userController)),
);

/**
 * @swagger
 * /users/changePassword:
 *   patch:
 *     summary: Change password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123!
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *                 description: Min 8 chars, uppercase, number, special character
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: password changed successfully!
 *       400:
 *         description: Incorrect current password
 */

router.patch(
  "/changePassword",
  authMiddleware,
  requireRole(Role.AGENT, Role.BUYER),
  Validate(changePasswordSchema, "body"),
  asyncHandler(userController.changePassword.bind(userController)),
);

/**
 * @swagger
 * /users/buyer:
 *   patch:
 *     summary: Update buyer profile
 *     tags: [Users]
 *     description: Buyer only. Update first and/or last name.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: uuid
 *                 firstName: John
 *                 lastName: Doe
 *               message: user updated successfully!
 */

router.patch(
  "/buyer",
  authMiddleware,
  requireRole(Role.BUYER),
  Validate(updateBuyerSchema, "body"),
  asyncHandler(userController.updateBuyer.bind(userController)),
);

/**
 * @swagger
 * /users/agent:
 *   patch:
 *     summary: Update agent profile
 *     tags: [Users]
 *     description: |
 *       Agent only. Update name and/or default viewing duration.
 *       `defaultViewingDuration` is used for all properties that don't
 *       have their own viewing duration set.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               defaultViewingDuration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 60
 *                 example: 45
 *                 description: Default viewing duration in minutes for all properties
 *     responses:
 *       200:
 *         description: Profile updated
 */

router.patch(
  "/agent",
  authMiddleware,
  requireRole(Role.AGENT),
  Validate(updateAgentSchema, "body"),
  asyncHandler(userController.updateAgent.bind(userController)),
);

export default router;
