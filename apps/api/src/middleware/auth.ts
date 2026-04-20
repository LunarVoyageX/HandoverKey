import { Request, Response, NextFunction } from "express";
import { JWTManager, JWTPayload } from "../auth/jwt";
import { SessionService } from "../services/session-service";
import { AuthenticationError } from "../errors";
import { logger } from "../config/logger";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  rawToken?: string;
}

function extractToken(req: AuthenticatedRequest): string | null {
  const authHeader = req.headers.authorization;
  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    const token = authHeader.substring(7).trim();
    if (token.length > 0) return token;
  }

  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    // Verify token cryptographically - this also checks expiration
    // Don't rely on separate expiration check that could be bypassed
    const decoded = JWTManager.verifyToken(token);

    // Additional validation of decoded payload - prevent bypass with incomplete payloads
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.userId ||
      typeof decoded.userId !== "string" ||
      !decoded.email ||
      typeof decoded.email !== "string" ||
      !decoded.sessionId ||
      typeof decoded.sessionId !== "string"
    ) {
      throw new AuthenticationError("Invalid token payload");
    }

    req.user = decoded;
    req.rawToken = token;
    next();
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : "Unknown error" },
      "Authentication failed",
    );

    // Pass to error handler
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError("Invalid token"));
    }
  }
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Use server-side session validation instead of user-controlled data
    const isAuthenticated = await SessionService.isAuthenticated(req);
    if (!isAuthenticated) {
      throw new AuthenticationError("Authentication required");
    }
    next();
  } catch (error) {
    // Only log errors in non-test environments
    if (process.env.NODE_ENV !== "test") {
      logger.error({ err: error }, "Authentication validation error");
    }

    // Pass to error handler
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError("Authentication required"));
    }
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const decoded = JWTManager.verifyToken(token);

        if (
          decoded &&
          typeof decoded === "object" &&
          decoded.userId &&
          typeof decoded.userId === "string" &&
          decoded.email &&
          typeof decoded.email === "string" &&
          decoded.sessionId &&
          typeof decoded.sessionId === "string"
        ) {
          req.user = decoded;
          const isAuthenticated = await SessionService.isAuthenticated(req);
          if (!isAuthenticated) {
            req.user = undefined;
          }
        }
      } catch {
        // Invalid token - silently ignore for optional auth
      }
    }
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : "Unknown error" },
      "Optional auth error",
    );
  }
  next();
};
