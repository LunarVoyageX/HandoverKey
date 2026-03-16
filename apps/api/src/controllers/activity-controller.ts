import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getDatabaseClient, ActivityRepository } from "@handoverkey/database";
import { AuthenticationError } from "../errors";

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
}
