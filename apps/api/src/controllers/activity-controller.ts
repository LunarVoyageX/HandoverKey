import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getDatabaseClient, ActivityRepository } from "@handoverkey/database";

export class ActivityController {
  private static getRepository(): ActivityRepository {
    const dbClient = getDatabaseClient();
    return new ActivityRepository(dbClient.getKysely());
  }

  /**
   * Get recent activity logs for the authenticated user
   */
  static async getRecentActivity(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const repository = ActivityController.getRepository();
      const activities = await repository.findByUserId(userId, limit, offset);

      res.json({
        data: activities,
        pagination: {
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
