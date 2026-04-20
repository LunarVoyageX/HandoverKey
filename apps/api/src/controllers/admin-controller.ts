import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { AccountLockoutService } from "../services/account-lockout-service";
import { UserService } from "../services/user-service";
import { AuthenticationError, NotFoundError } from "../errors";
import { getDatabaseClient } from "@handoverkey/database";
import { HandoverProcessStatus } from "@handoverkey/shared/src/types/dead-mans-switch";

export class AdminController {
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const db = getDatabaseClient().getKysely();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      const [
        totalUsersResult,
        verifiedUsersResult,
        lockedUsersResult,
        activeHandoversResult,
        recentActivities,
      ] = await Promise.all([
        db
          .selectFrom("users")
          .select((eb) => eb.fn.count<number>("id").as("count"))
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("users")
          .select((eb) => eb.fn.count<number>("id").as("count"))
          .where("email_verified", "=", true)
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("users")
          .select((eb) => eb.fn.count<number>("id").as("count"))
          .where("locked_until", "is not", null)
          .where("locked_until", ">", now)
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("handover_processes")
          .select((eb) => eb.fn.count<number>("id").as("count"))
          .where("status", "in", [
            HandoverProcessStatus.GRACE_PERIOD,
            HandoverProcessStatus.AWAITING_SUCCESSORS,
            HandoverProcessStatus.VERIFICATION_PENDING,
            HandoverProcessStatus.READY_FOR_TRANSFER,
          ])
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("activity_records")
          .select([
            "activity_type",
            (eb) => eb.fn.count<number>("id").as("count"),
          ])
          .where("created_at", ">=", oneDayAgo)
          .groupBy("activity_type")
          .execute(),
      ]);

      res.json({
        stats: {
          totalUsers: Number(totalUsersResult.count),
          verifiedUsers: Number(verifiedUsersResult.count),
          lockedUsers: Number(lockedUsersResult.count),
          activeHandovers: Number(activeHandoversResult.count),
        },
        activityLast24h: recentActivities.map((row) => ({
          type: row.activity_type,
          count: Number(row.count),
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const db = getDatabaseClient().getKysely();
      const search =
        typeof req.query.search === "string" ? req.query.search : "";
      const limitRaw =
        typeof req.query.limit === "string"
          ? parseInt(req.query.limit, 10)
          : 25;
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 100)
        : 25;

      let query = db
        .selectFrom("users")
        .select([
          "id",
          "email",
          "name",
          "email_verified",
          "failed_login_attempts",
          "locked_until",
          "last_login",
          "created_at",
        ])
        .orderBy("created_at", "desc")
        .limit(limit);

      if (search.trim().length > 0) {
        const searchPattern = `%${search.trim()}%`;
        query = query.where((eb) =>
          eb.or([
            eb("email", "ilike", searchPattern),
            eb("name", "ilike", searchPattern),
          ]),
        );
      }

      const users = await query.execute();
      res.json({
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.email_verified,
          failedLoginAttempts: user.failed_login_attempts,
          lockedUntil: user.locked_until,
          lastLogin: user.last_login,
          createdAt: user.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlock a user account (admin only)
   */
  static async unlockAccount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const userId = String(req.params.userId);

      // Verify user exists
      const user = await UserService.findUserById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      // Unlock the account
      await AccountLockoutService.unlockAccount(userId);

      // Log the action
      await UserService.logActivity(
        req.user.userId,
        "ADMIN_UNLOCKED_ACCOUNT",
        req.ip,
      );

      res.json({
        message: "Account unlocked successfully",
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account lockout status
   */
  static async getLockoutStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const userId = String(req.params.userId);

      // Verify user exists
      const user = await UserService.findUserById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      const lockStatus = await AccountLockoutService.isLocked(userId);
      const attemptCount = await AccountLockoutService.getAttemptCount(userId);
      const timeUntilUnlock =
        await AccountLockoutService.getTimeUntilUnlock(userId);

      res.json({
        userId: user.id,
        email: user.email,
        isLocked: lockStatus.isLocked,
        lockedUntil: lockStatus.lockedUntil,
        attemptCount,
        timeUntilUnlock,
      });
    } catch (error) {
      next(error);
    }
  }
}
