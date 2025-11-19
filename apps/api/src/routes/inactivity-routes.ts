import { Router } from "express";
import { InactivityController } from "../controllers/inactivity-controller";
import { authenticateJWT, requireAuth } from "../middleware/auth";
import { SimpleActivityMiddleware } from "../middleware/simple-activity";
import { validateRequest } from "../validation";
import {
  UpdateInactivitySettingsSchema,
  PauseSwitchSchema,
  ResumeSwitchSchema,
} from "../validation/schemas";

const router = Router();

// All inactivity routes require authentication
router.use(authenticateJWT);
router.use(requireAuth);

// Track settings access for all routes
router.use(SimpleActivityMiddleware.trackActivity("SETTINGS_ACCESS"));

/**
 * Get user's inactivity settings
 * GET /api/v1/inactivity/settings
 */
router.get("/settings", InactivityController.getSettings);

/**
 * Update user's inactivity settings
 * PUT /api/v1/inactivity/settings
 *
 * Body:
 * {
 *   "thresholdDays": 90,
 *   "requireMajority": false,
 *   "isPaused": false
 * }
 */
router.put(
  "/settings",
  validateRequest(UpdateInactivitySettingsSchema, "body"),
  InactivityController.updateSettings,
);

/**
 * Pause the dead man's switch
 * POST /api/v1/inactivity/pause
 *
 * Body:
 * {
 *   "pauseUntil": "2024-01-01T00:00:00Z" // optional
 * }
 */
router.post(
  "/pause",
  validateRequest(PauseSwitchSchema, "body"),
  InactivityController.pauseSwitch,
);

/**
 * Resume the dead man's switch
 * POST /api/v1/inactivity/resume
 */
router.post(
  "/resume",
  validateRequest(ResumeSwitchSchema, "body"),
  InactivityController.resumeSwitch,
);

export default router;
