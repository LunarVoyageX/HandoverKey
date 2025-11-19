import crypto from "crypto";
import { JWTPayload } from "../auth/jwt";
import { UserService } from "./user-service";
import { SessionRepository } from "@handoverkey/database";
import { DatabaseClient } from "@handoverkey/database";

import { logger } from "../config/logger";

export interface CreateSessionOptions {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionService {
  private static sessionRepository: SessionRepository;

  /**
   * Initialize the session service with database client
   */
  static initialize(db: DatabaseClient): void {
    this.sessionRepository = new SessionRepository(db.getKysely());
  }

  /**
   * Create a new session in the database
   */
  static async createSession(options: CreateSessionOptions): Promise<string> {
    try {
      const session = await this.sessionRepository.create({
        user_id: options.userId,
        token_hash: options.tokenHash,
        expires_at: options.expiresAt,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
      });

      logger.info(
        {
          sessionId: session.id,
          userId: options.userId,
          expiresAt: options.expiresAt,
        },
        "Session created",
      );

      return session.id;
    } catch (error) {
      logger.error(
        { error, userId: options.userId },
        "Failed to create session",
      );
      throw error;
    }
  }

  /**
   * Hash a token for secure storage
   */
  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Validates a session by checking server-side data, not user-controlled input
   * This prevents user-controlled bypass of security checks
   */
  static async validateSession(
    payload: JWTPayload | undefined,
  ): Promise<boolean> {
    if (!payload) {
      return false;
    }

    // Validate payload structure (server-side validation)
    if (
      !payload.userId ||
      typeof payload.userId !== "string" ||
      !payload.email ||
      typeof payload.email !== "string" ||
      !payload.sessionId ||
      typeof payload.sessionId !== "string"
    ) {
      return false;
    }

    try {
      // Check if session exists in database and is not expired
      const session = await this.sessionRepository.findById(payload.sessionId);

      if (!session) {
        logger.warn(
          { sessionId: payload.sessionId, userId: payload.userId },
          "Session not found or expired",
        );
        return false;
      }

      // Verify session belongs to the user
      if (session.user_id !== payload.userId) {
        logger.warn(
          {
            sessionId: payload.sessionId,
            sessionUserId: session.user_id,
            payloadUserId: payload.userId,
          },
          "Session user mismatch",
        );
        return false;
      }

      // Server-side validation - check if user exists in database
      const user = await UserService.findUserById(payload.userId);

      if (!user) {
        logger.warn({ userId: payload.userId }, "User not found");
        return false;
      }

      // Validate email matches (server-side check)
      if (user.email !== payload.email) {
        logger.warn(
          {
            userId: payload.userId,
            sessionEmail: payload.email,
            userEmail: user.email,
          },
          "Email mismatch",
        );
        return false;
      }

      // Update last activity timestamp
      await this.sessionRepository.updateLastActivity(session.id);

      return true;
    } catch (error) {
      logger.error(
        { error, userId: payload.userId },
        "Session validation error",
      );
      return false;
    }
  }

  /**
   * Validates authentication for a request using server-side checks
   */
  static async isAuthenticated(req: { user?: JWTPayload }): Promise<boolean> {
    return await this.validateSession(req.user);
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.delete(sessionId);
      logger.info({ sessionId }, "Session invalidated");
    } catch (error) {
      logger.error({ error, sessionId }, "Failed to invalidate session");
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user (e.g., on password change)
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await this.sessionRepository.deleteByUserId(userId);
      logger.info({ userId }, "All user sessions invalidated");
    } catch (error) {
      logger.error({ error, userId }, "Failed to invalidate user sessions");
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string) {
    try {
      return await this.sessionRepository.findByUserId(userId);
    } catch (error) {
      logger.error({ error, userId }, "Failed to get user sessions");
      throw error;
    }
  }

  /**
   * Clean up expired sessions (called by background job)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const deletedCount = await this.sessionRepository.deleteExpired();
      logger.info({ deletedCount }, "Expired sessions cleaned up");
      return deletedCount;
    } catch (error) {
      logger.error({ error }, "Failed to cleanup expired sessions");
      throw error;
    }
  }
}
