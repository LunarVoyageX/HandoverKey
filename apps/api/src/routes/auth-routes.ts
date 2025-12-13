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

// Delete account endpoint (requires authentication)
router.delete(
  "/delete-account",
  authenticateJWT,
  requireAuth,
  SimpleActivityMiddleware.trackActivity("ACCOUNT_DELETION"),
  AuthController.deleteAccount,
);

export default router;
