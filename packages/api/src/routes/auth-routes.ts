import { Router } from "express";
import { AuthController } from "../controllers/auth-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { authRateLimiter } from "../middleware/security";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";

const router = Router();

// Registration endpoint
router.post(
  "/register",
  authRateLimiter,
  AuthController.registerValidation,
  AuthController.register,
);

// Login endpoint
router.post(
  "/login",
  authRateLimiter,
  AuthController.loginValidation,
  AuthController.login,
  SimpleActivityMiddleware.trackActivity("LOGIN"),
);

// Logout endpoint (requires authentication)
router.post("/logout", authenticateJWT, requireAuth, AuthController.logout);

// Token refresh endpoint
router.post("/refresh", authRateLimiter, AuthController.refreshToken);

// Get user profile (requires authentication)
router.get(
  "/profile",
  authenticateJWT,
  requireAuth,
  SimpleActivityMiddleware.trackActivity("PROFILE_ACCESS"),
  AuthController.getProfile,
);

export default router;
