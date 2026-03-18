import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { validateRequest } from "../validation";
import {
  CheckInSchema,
  CheckInTokenQuerySchema,
  CheckInTokenSchema,
} from "../validation/schemas";
import { ActivityController } from "../controllers/activity-controller";

const router = Router();
const publicActivityRouter = Router();

/**
 * Public secure check-in link validation
 * GET /api/v1/activity/check-in-link?token=...
 */
publicActivityRouter.get(
  "/check-in-link",
  validateRequest(CheckInTokenQuerySchema, "query"),
  ActivityController.validateCheckInLink,
);

/**
 * Public secure check-in execution
 * POST /api/v1/activity/check-in-link
 */
publicActivityRouter.post(
  "/check-in-link",
  validateRequest(CheckInTokenSchema, "body"),
  ActivityController.checkInWithToken,
);

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
  ActivityController.manualCheckIn,
);

export default router;
export { publicActivityRouter };
