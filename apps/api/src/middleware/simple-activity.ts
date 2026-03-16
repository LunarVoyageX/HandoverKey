import { Response, NextFunction } from "express";
import { UserService } from "../services/user-service";
import { AuthenticatedRequest } from "./auth";
import { logger } from "../config/logger";

export class SimpleActivityMiddleware {
  /**
   * Simple middleware to track user activity
   */
  static trackActivity(activityType: string) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        // Only track activity for authenticated users
        if (!req.user?.userId) {
          return next();
        }

        // Skip tracking for health checks
        if (req.path.includes("/health")) {
          return next();
        }

        // Record activity
        // In test environment, await to ensure DB connection is still open
        if (process.env.NODE_ENV === "test") {
          await UserService.logActivity(req.user!.userId, activityType, req.ip);
        } else {
          // In production, record asynchronously to avoid blocking the request
          process.nextTick(async () => {
            try {
              await UserService.logActivity(
                req.user!.userId,
                activityType,
                req.ip,
              );
            } catch (error) {
              logger.error({ err: error }, "Failed to record activity");
            }
          });
        }

        next();
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          logger.error({ err: error }, "Activity middleware error");
        }
        next();
      }
    };
  }

  /**
   * Manual check-in endpoint handler
   */
  static async handleManualCheckIn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await UserService.logActivity(req.user.userId, "MANUAL_CHECKIN", req.ip);

      res.json({
        success: true,
        message: "Check-in recorded successfully",
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        logger.error({ err: error }, "Manual check-in error");
      }
      res.status(500).json({ error: "Failed to record check-in" });
    }
  }
}
