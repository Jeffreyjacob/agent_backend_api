import { Router } from "express";
import { Validate } from "../../middleware/validate";
import {
  forgetPasswordSchema,
  loginSchema,
  registerAgentSchema,
  registerBuyerSchema,
  resendEmailOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { authController } from "../../container";
import { authRateLimit } from "../../middleware/rateLimit";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 * name:Authentication
 * description: Registration,login ,email verification, password reset
 *
 */

/**
 * @swagger
 * /auth/register/buyer:
 * post:
 *   summary: Register a new buyer account
 *   tags: [Authentication]
 *   security: []
 *   requestBody:
 *       required: true
 *       content:
 *          application/json:
 *            schema:
 *              type:object
 *              required:[firstName,lastName,email,password]
 *              properties:
 *                firstName:
 *                   type: string
 *                   example: John
 *                lastName:
 *                   type:string
 *                   example: Doe
 *                email:
 *                   type: string
 *                   format: email
 *                   example: john@example.com
 *                password:
 *                   type: string
 *                   example: Password123!
 *                   description: Min 8 chars, uppercase , number, special character
 *     Response:
 *        201:
 *         description: Account created — check email for OTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   example: ""
 *                 message:
 *                   type: string
 *                   example: User account has been created successfully
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *          $ref: '#/components/responses/TooManyRequests'
 *
 *
 *
 */

router.post(
  "/register/buyer",
  Validate(registerBuyerSchema, "body"),
  asyncHandler(authController.registerBuyer.bind(authController)),
);

/**
 * @swagger
 * /auth/register/agent:
 *   post:
 *     summary: Register a new agent account
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Creates an agent account. Email verification required before login.
 *       After registration, agent must subscribe before listing properties.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@agency.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Agent account created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: User account has been created successfully
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */

router.post(
  "/register/agent",
  Validate(registerAgentSchema, "body"),
  asyncHandler(authController.registerAgent.bind(authController)),
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive access token
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Returns a JWT access token (15 min) and sets an HttpOnly refresh token cookie (7 days).
 *
 *       Copy the `accessToken` from the response and use it in the **Authorize** button above.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly refresh token cookie
 *             schema:
 *               type: string
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [BUYER, AGENT, ADMIN]
 *                     accessToken:
 *                       type: string
 *                       description: JWT — expires in 15 minutes
 *                       example: eyJhbGciOiJIUzI1NiJ9...
 *                 message:
 *                   type: string
 *                   example: user logged in
 *       401:
 *         description: Invalid credentials or email not verified
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */

router.post(
  "/login",
  authRateLimit,
  Validate(loginSchema, "body"),
  asyncHandler(authController.login.bind(authController)),
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Authentication]
 *     security: []
 *     description: OTP expires after 15 minutes. Request new OTP via /resend-otp.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 example: "482910"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: User email has been verified
 *       401:
 *         description: Invalid or expired OTP
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */

router.post(
  "/verify-email",
  Validate(verifyEmailSchema, "body"),
  asyncHandler(authController.verifyEmail.bind(authController)),
);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Resend email verification OTP
 *     tags: [Authentication]
 *     security: []
 *     description: Cooldown of 15 minutes between requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: OTP sent
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: OTP has been sent to your email
 *       400:
 *         description: Email already verified
 *       429:
 *         description: Please wait before requesting another OTP
 */

router.post(
  "/resend-otp",
  Validate(resendEmailOtpSchema, "body"),
  authController.resendEmailOtp.bind(authController),
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Sends reset link to email. Always returns success (security best practice —
 *       don't reveal if email exists). Cooldown of 1 hour between requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: If email exists, reset link sent
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: A link would be sent to your email, if this email belongs to an account in our system
 */

router.post(
  "/forgot-password",
  authRateLimit,
  Validate(forgetPasswordSchema, "body"),
  asyncHandler(authController.forgetPassword.bind(authController)),
);

/**
 * @swagger
 * /auth/reset-password:
 *   patch:
 *     summary: Reset password using token from email
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Token from the reset email link
 *                 example: a1b2c3d4e5f6...
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password reset successfully. All sessions invalidated.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: Password has been reset successfully
 *       401:
 *         description: Invalid or expired reset token
 */

router.patch(
  "/reset-password",
  authRateLimit,
  Validate(resetPasswordSchema, "body"),
  asyncHandler(authController.resetPassword.bind(authController)),
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Get a new access token using refresh token cookie
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Uses the HttpOnly refresh token cookie automatically.
 *       Returns a new access token and rotates the refresh token.
 *       Old refresh token is invalidated immediately.
 *     responses:
 *       200:
 *         description: New access token issued
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
 *                     accessToken:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Access token refreshed
 *       401:
 *         description: Invalid or expired refresh token
 */

router.post(
  "/refresh-token",
  asyncHandler(authController.refreshToken.bind(authController)),
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate tokens
 *     tags: [Authentication]
 *     description: |
 *       Blacklists the access token and deletes the refresh token.
 *       Both tokens are immediately invalidated.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: ""
 *               message: user has been logged out
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.post(
  "/logout",
  authMiddleware,
  asyncHandler(authController.logout.bind(authController)),
);

export default router;
