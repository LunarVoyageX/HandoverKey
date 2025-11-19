import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { SessionService } from "../services/session-service";
import { AuthenticationError } from "../errors";

export class SessionController {
  /**
   * Get all active sessions for the authenticated user
   */
  static async getSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const sessions = await SessionService.getUserSessions(req.user.userId);

      res.json({
        sessions: sessions.map((session) => ({
          id: session.id,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          createdAt: session.created_at,
          lastActivity: session.last_activity,
          expiresAt: session.expires_at,
          isCurrent: session.id === req.user?.sessionId,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const { sessionId } = req.params;

      // Verify the session belongs to the user
      const sessions = await SessionService.getUserSessions(req.user.userId);
      const sessionToDelete = sessions.find((s) => s.id === sessionId);

      if (!sessionToDelete) {
        throw new AuthenticationError("Session not found or unauthorized");
      }

      await SessionService.invalidateSession(sessionId);

      res.json({
        message: "Session invalidated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invalidate all sessions except the current one
   */
  static async invalidateAllOtherSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError("Not authenticated");
      }

      const sessions = await SessionService.getUserSessions(req.user.userId);

      // Invalidate all sessions except the current one
      const invalidatePromises = sessions
        .filter((s) => s.id !== req.user?.sessionId)
        .map((s) => SessionService.invalidateSession(s.id));

      await Promise.all(invalidatePromises);

      res.json({
        message: "All other sessions invalidated successfully",
        invalidatedCount: invalidatePromises.length,
      });
    } catch (error) {
      next(error);
    }
  }
}
