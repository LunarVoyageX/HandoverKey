import { Response } from "express";
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
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      // Data is already validated and sanitized by Zod middleware
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
}
