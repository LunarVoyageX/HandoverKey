import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";
import { validateRequest } from "../validation";
import { CheckInSchema } from "../validation/schemas";

const router = Router();

// All activity routes require authentication
router.use(authenticateJWT);

/**
 * POST /api/v1/activity/check-in
 * Manual check-in to reset inactivity timer
 */
router.post(
  "/check-in",
  validateRequest(CheckInSchema, "body"),
  SimpleActivityMiddleware.handleManualCheckIn,
);

// Simplified activity routes - complex status and history removed for MVP

export default router;
