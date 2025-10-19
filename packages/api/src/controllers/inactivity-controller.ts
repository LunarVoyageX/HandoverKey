import { Response } from "express";
import { body, validationResult } from "express-validator";
import { InactivityService } from "../services/inactivity-service";
import { UserService } from "../services/user-service";
import { AuthenticatedRequest } from "../middleware/auth";

export class InactivityController {
  /**
   * Get user's inactivity settings
   */
  static async getSettings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const settings = await InactivityService.getSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error getting inactivity settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update user's inactivity settings
   */
  static async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const updates = req.body;
      const settings = await InactivityService.updateSettings(userId, updates);

      // Log the activity
      await UserService.logActivity(userId, "SETTINGS_UPDATED", req.ip);

      res.json({
        message: "Settings updated successfully",
        settings,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Pause the dead man's switch
   */
  static async pauseSwitch(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { pauseUntil } = req.body;
      const pauseDate = pauseUntil ? new Date(pauseUntil) : undefined;

      await InactivityService.pauseSwitch(userId, pauseDate);
      await UserService.logActivity(userId, "SWITCH_PAUSED", req.ip);

      res.json({
        message: "Dead man's switch paused successfully",
        pausedUntil: pauseDate,
      });
    } catch (error) {
      console.error("Error pausing switch:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Resume the dead man's switch
   */
  static async resumeSwitch(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      await InactivityService.resumeSwitch(userId);
      await UserService.logActivity(userId, "SWITCH_RESUMED", req.ip);

      res.json({
        message: "Dead man's switch resumed successfully",
      });
    } catch (error) {
      console.error("Error resuming switch:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Validation rules for settings update
   */
  static updateSettingsValidation = [
    body("thresholdDays")
      .optional()
      .isInt({ min: 30, max: 365 })
      .withMessage("Threshold must be between 30 and 365 days"),
    body("requireMajority")
      .optional()
      .isBoolean()
      .withMessage("Require majority must be a boolean"),
    body("isPaused")
      .optional()
      .isBoolean()
      .withMessage("Is paused must be a boolean"),
  ];
}
