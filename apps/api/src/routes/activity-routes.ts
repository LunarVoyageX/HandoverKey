import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";
import { validateRequest } from "../validation";
import { CheckInSchema } from "../validation/schemas";
import { ActivityController } from "../controllers/activity-controller";

const router = Router();

// All activity routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/v1/activity
 * Get recent activity logs
 */
router.get("/", ActivityController.getRecentActivity);

/**
 * POST /api/v1/activity/check-in
 * Manual check-in to reset inactivity timer
 */
router.post(
  "/check-in",
  validateRequest(CheckInSchema, "body"),
  SimpleActivityMiddleware.handleManualCheckIn,
);

export default router;
