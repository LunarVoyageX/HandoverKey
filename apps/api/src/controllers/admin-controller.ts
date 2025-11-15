import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { AccountLockoutService } from "../services/account-lockout-service";
import { UserService } from "../services/user-service";
import { AuthenticationError, NotFoundError } from "../errors";

export class AdminController {
  /**
   * Unlock a user account (admin only)
   */
  static async unlockAccount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { userId } = req.params;

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
        req.ip
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
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { userId } = req.params;

      // Verify user exists
      const user = await UserService.findUserById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

      const lockStatus = await AccountLockoutService.isLocked(userId);
      const attemptCount = await AccountLockoutService.getAttemptCount(userId);
      const timeUntilUnlock = await AccountLockoutService.getTimeUntilUnlock(userId);

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
