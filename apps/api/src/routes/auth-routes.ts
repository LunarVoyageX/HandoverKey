import { Router } from "express";
import { AuthController } from "../controllers/auth-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { authRateLimiter, registerRateLimiter } from "../middleware/security";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";
import { validateRequest } from "../validation";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  TwoFactorSetupSchema,
  TwoFactorEnableSchema,
  TwoFactorDisableSchema,
} from "../validation/schemas";

const router = Router();

// Registration endpoint
router.post(
  "/register",
  registerRateLimiter as unknown as import("express").RequestHandler,
  validateRequest(RegisterSchema, "body"),
  AuthController.register,
);

// Login endpoint
router.post(
  "/login",
  authRateLimiter as unknown as import("express").RequestHandler,
  validateRequest(LoginSchema, "body"),
  AuthController.login,
  SimpleActivityMiddleware.trackActivity("LOGIN"),
);

// Forgot password endpoint
router.post(
  "/forgot-password",
  authRateLimiter as unknown as import("express").RequestHandler,
  validateRequest(PasswordResetRequestSchema, "body"),
  AuthController.forgotPassword,
);

// Reset password endpoint
router.post(
  "/reset-password",
  authRateLimiter as unknown as import("express").RequestHandler,
  validateRequest(PasswordResetConfirmSchema, "body"),
  AuthController.resetPassword,
  SimpleActivityMiddleware.trackActivity("PASSWORD_RESET"),
);

// Verify email endpoint
router.get("/verify-email", AuthController.verifyEmail);

// Resend verification email endpoint
router.post(
  "/resend-verification",
  validateRequest(PasswordResetRequestSchema, "body"),
  AuthController.resendVerificationEmail,
);

// Logout endpoint (requires authentication)
router.post("/logout", authenticateJWT, requireAuth, AuthController.logout);

// Token refresh endpoint
router.post(
  "/refresh",
  authRateLimiter as unknown as import("express").RequestHandler,
  validateRequest(RefreshTokenSchema, "body"),
  AuthController.refreshToken,
);

// Get user profile (requires authentication)
router.get(
  "/profile",
  authenticateJWT,
  requireAuth,
  SimpleActivityMiddleware.trackActivity("PROFILE_ACCESS"),
  AuthController.getProfile,
);

// Update profile (requires authentication)
router.put(
  "/profile",
  authenticateJWT,
  requireAuth,
  validateRequest(UpdateProfileSchema, "body"),
  AuthController.updateProfile,
);

// Change password and rotate vault encryption (requires authentication)
router.put(
  "/change-password",
  authenticateJWT,
  requireAuth,
  validateRequest(ChangePasswordSchema, "body"),
  AuthController.changePassword,
);

// Initialize two-factor setup (requires authentication)
router.post(
  "/2fa/setup",
  authenticateJWT,
  requireAuth,
  validateRequest(TwoFactorSetupSchema, "body"),
  AuthController.setupTwoFactor,
);

// Enable two-factor authentication (requires authentication)
router.post(
  "/2fa/enable",
  authenticateJWT,
  requireAuth,
  validateRequest(TwoFactorEnableSchema, "body"),
  AuthController.enableTwoFactor,
);

// Disable two-factor authentication (requires authentication)
router.post(
  "/2fa/disable",
  authenticateJWT,
  requireAuth,
  validateRequest(TwoFactorDisableSchema, "body"),
  AuthController.disableTwoFactor,
);

// Delete account endpoint (requires authentication)
router.delete(
  "/delete-account",
  authenticateJWT,
  requireAuth,
  SimpleActivityMiddleware.trackActivity("ACCOUNT_DELETION"),
  AuthController.deleteAccount,
);

export default router;
