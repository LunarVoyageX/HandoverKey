import { Response, NextFunction } from "express";
import {
  InactivityService,
  InactivitySettings,
} from "../services/inactivity-service";
import { UserService } from "../services/user-service";
import { AuthenticatedRequest } from "../middleware/auth";
import { AuthenticationError } from "../errors";

export class InactivityController {
  static async getSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError("Not authenticated");
      }

      const settings = await InactivityService.getSettings(req.user.userId);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError("Not authenticated");
      }

      const updates = req.body as Partial<InactivitySettings>;
      const settings = await InactivityService.updateSettings(
        req.user.userId,
        updates,
      );

      await UserService.logActivity(
        req.user.userId,
        "SETTINGS_UPDATED",
        req.ip,
      );

      res.json({
        message: "Settings updated successfully",
        settings,
      });
    } catch (error) {
      next(error);
    }
  }

  static async pauseSwitch(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError("Not authenticated");
      }

      const { pauseUntil } = req.body;
      const pauseDate = pauseUntil ? new Date(pauseUntil) : undefined;

      await InactivityService.pauseSwitch(req.user.userId, pauseDate);
      await UserService.logActivity(req.user.userId, "SWITCH_PAUSED", req.ip);

      res.json({
        message: "Dead man's switch paused successfully",
        pausedUntil: pauseDate,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resumeSwitch(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError("Not authenticated");
      }

      await InactivityService.resumeSwitch(req.user.userId);
      await UserService.logActivity(req.user.userId, "SWITCH_RESUMED", req.ip);

      res.json({
        message: "Dead man's switch resumed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
