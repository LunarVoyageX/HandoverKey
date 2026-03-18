import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getDatabaseClient, ActivityRepository } from "@handoverkey/database";
import { AuthenticationError } from "../errors";
import { UserService } from "../services/user-service";
import { NotificationService } from "../services/notification-service";
import { HandoverOrchestrator } from "../services/handover-orchestrator";

export class ActivityController {
  private static getRepository(): ActivityRepository {
    const dbClient = getDatabaseClient();
    return new ActivityRepository(dbClient.getKysely());
  }

  static async getRecentActivity(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError("Not authenticated");
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const repository = ActivityController.getRepository();
      const activities = await repository.findByUserId(
        req.user.userId,
        limit,
        offset,
      );

      res.json({
        data: activities,
        pagination: {
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async manualCheckIn(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError("Not authenticated");
      }

      await UserService.logActivity(req.user.userId, "MANUAL_CHECKIN", req.ip);

      const orchestrator = new HandoverOrchestrator();
      await orchestrator.cancelHandover(
        req.user.userId,
        "User manually checked in",
      );

      res.json({
        success: true,
        message: "Check-in recorded successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async validateCheckInLink(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        res.status(400).json({
          success: false,
          message: "Check-in token is required",
        });
        return;
      }

      const notificationService = new NotificationService();
      const validation = await notificationService.validateCheckInLink(token);

      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: validation.error || "Invalid check-in token",
        });
        return;
      }

      res.json({
        success: true,
        message: "Check-in link is valid",
        remainingTime: validation.remainingTime,
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkInWithToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        res.status(400).json({
          success: false,
          message: "Check-in token is required",
        });
        return;
      }

      const notificationService = new NotificationService();
      const validation = await notificationService.validateCheckInLink(token);

      if (!validation.isValid || !validation.userId) {
        res.status(400).json({
          success: false,
          message: validation.error || "Invalid check-in token",
        });
        return;
      }

      await notificationService.markCheckInTokenUsed(
        token,
        req.ip,
        req.get("user-agent"),
      );
      await UserService.logActivity(
        validation.userId,
        "MANUAL_CHECKIN",
        req.ip,
      );

      const orchestrator = new HandoverOrchestrator();
      await orchestrator.cancelHandover(
        validation.userId,
        "User checked in with secure link",
      );

      res.json({
        success: true,
        message: "Secure check-in completed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
