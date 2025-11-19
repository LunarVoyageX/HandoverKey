import { getRedisClient } from "../config/redis";
import { logger } from "../config/logger";
import { UserService } from "./user-service";

export interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining?: number;
  lockedUntil?: Date;
  attemptCount?: number;
}

export class AccountLockoutService {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
  private static readonly ATTEMPT_WINDOW = 15 * 60; // 15 minutes in seconds

  /**
   * Get Redis key for tracking failed attempts
   */
  private static getAttemptKey(userId: string): string {
    return `lockout:attempts:${userId}`;
  }

  /**
   * Get Redis key for lockout status
   */
  private static getLockKey(userId: string): string {
    return `lockout:locked:${userId}`;
  }

  /**
   * Record a failed login attempt
   */
  static async recordFailedAttempt(
    userId: string,
    ipAddress?: string,
  ): Promise<LockoutStatus> {
    const redis = getRedisClient();
    const attemptKey = this.getAttemptKey(userId);
    const lockKey = this.getLockKey(userId);

    try {
      // Increment attempt counter
      const attempts = await redis.incr(attemptKey);

      // Set expiry on first attempt
      if (attempts === 1) {
        await redis.expire(attemptKey, this.ATTEMPT_WINDOW);
      }

      logger.warn(
        {
          userId,
          attempts,
          ipAddress,
          maxAttempts: this.MAX_ATTEMPTS,
        },
        "Failed login attempt recorded",
      );

      // Check if we've reached the lockout threshold
      if (attempts >= this.MAX_ATTEMPTS) {
        await this.lockAccount(userId);

        logger.warn(
          {
            userId,
            attempts,
            ipAddress,
            lockoutDuration: this.LOCKOUT_DURATION,
          },
          "Account locked due to too many failed attempts",
        );

        return {
          isLocked: true,
          lockedUntil: new Date(Date.now() + this.LOCKOUT_DURATION * 1000),
          attemptCount: attempts,
        };
      }

      return {
        isLocked: false,
        attemptsRemaining: this.MAX_ATTEMPTS - attempts,
        attemptCount: attempts,
      };
    } catch (error) {
      logger.error({ error, userId }, "Failed to record login attempt");
      // Don't throw - allow login to proceed if Redis is down
      return {
        isLocked: false,
        attemptsRemaining: this.MAX_ATTEMPTS,
      };
    }
  }

  /**
   * Lock an account
   */
  private static async lockAccount(userId: string): Promise<void> {
    const redis = getRedisClient();
    const lockKey = this.getLockKey(userId);

    try {
      // Set lock in Redis with expiry
      await redis.setEx(lockKey, this.LOCKOUT_DURATION, Date.now().toString());

      // Update database with locked_until timestamp
      const lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION * 1000);

      // Directly update using repository to avoid UserService mapping
      const { UserRepository } = await import("@handoverkey/database");
      const { getDatabaseClient } = await import("@handoverkey/database");
      const dbClient = getDatabaseClient();
      const userRepo = new UserRepository(dbClient.getKysely());

      await userRepo.update(userId, {
        locked_until: lockedUntil,
        failed_login_attempts: this.MAX_ATTEMPTS,
      });

      logger.info(
        {
          userId,
          lockedUntil,
        },
        "Account locked in database",
      );
    } catch (error) {
      logger.error({ error, userId }, "Failed to lock account");
      throw error;
    }
  }

  /**
   * Check if an account is locked
   */
  static async isLocked(userId: string): Promise<LockoutStatus> {
    const redis = getRedisClient();
    const lockKey = this.getLockKey(userId);

    try {
      // Check Redis first (faster)
      const lockTimestamp = await redis.get(lockKey);

      if (lockTimestamp) {
        const ttl = await redis.ttl(lockKey);
        const lockedUntil = new Date(Date.now() + ttl * 1000);

        return {
          isLocked: true,
          lockedUntil,
        };
      }

      // Check database as fallback
      const user = await UserService.findUserById(userId);

      if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return {
          isLocked: true,
          lockedUntil: new Date(user.lockedUntil),
        };
      }

      return {
        isLocked: false,
      };
    } catch (error) {
      logger.error({ error, userId }, "Failed to check lockout status");
      // If we can't check, assume not locked to avoid blocking legitimate users
      return {
        isLocked: false,
      };
    }
  }

  /**
   * Clear failed attempts after successful login
   */
  static async clearAttempts(userId: string): Promise<void> {
    const redis = getRedisClient();
    const attemptKey = this.getAttemptKey(userId);

    try {
      await redis.del(attemptKey);

      // Clear database fields
      const { UserRepository } = await import("@handoverkey/database");
      const { getDatabaseClient } = await import("@handoverkey/database");
      const dbClient = getDatabaseClient();
      const userRepo = new UserRepository(dbClient.getKysely());

      await userRepo.update(userId, {
        failed_login_attempts: 0,
        locked_until: null,
      });

      logger.info({ userId }, "Failed login attempts cleared");
    } catch (error) {
      logger.error({ error, userId }, "Failed to clear login attempts");
      // Don't throw - this is not critical
    }
  }

  /**
   * Manually unlock an account (admin function)
   */
  static async unlockAccount(userId: string): Promise<void> {
    const redis = getRedisClient();
    const lockKey = this.getLockKey(userId);
    const attemptKey = this.getAttemptKey(userId);

    try {
      // Remove from Redis
      await redis.del(lockKey);
      await redis.del(attemptKey);

      // Clear database fields
      const { UserRepository } = await import("@handoverkey/database");
      const { getDatabaseClient } = await import("@handoverkey/database");
      const dbClient = getDatabaseClient();
      const userRepo = new UserRepository(dbClient.getKysely());

      await userRepo.update(userId, {
        failed_login_attempts: 0,
        locked_until: null,
      });

      logger.info({ userId }, "Account manually unlocked");
    } catch (error) {
      logger.error({ error, userId }, "Failed to unlock account");
      throw error;
    }
  }

  /**
   * Get current attempt count
   */
  static async getAttemptCount(userId: string): Promise<number> {
    const redis = getRedisClient();
    const attemptKey = this.getAttemptKey(userId);

    try {
      const attempts = await redis.get(attemptKey);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      logger.error({ error, userId }, "Failed to get attempt count");
      return 0;
    }
  }

  /**
   * Get time remaining until unlock
   */
  static async getTimeUntilUnlock(userId: string): Promise<number | null> {
    const lockStatus = await this.isLocked(userId);

    if (!lockStatus.isLocked || !lockStatus.lockedUntil) {
      return null;
    }

    const timeRemaining = lockStatus.lockedUntil.getTime() - Date.now();
    return Math.max(0, Math.floor(timeRemaining / 1000)); // Return seconds
  }
}
