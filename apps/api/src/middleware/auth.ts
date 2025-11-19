import { Request, Response, NextFunction } from "express";
import { JWTManager, JWTPayload } from "../auth/jwt";
import { SessionService } from "../services/session-service";
import { AuthenticationError } from "../errors";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Secure token extraction - validate header format strictly
    const authHeader = req.headers.authorization;

    // Prevent bypass attempts with malformed headers
    if (!authHeader || typeof authHeader !== "string") {
      throw new AuthenticationError("No token provided");
    }

    // Strict Bearer token format validation - prevent bypass with case variations
    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.substring(7).trim();

    // Validate token is not empty after extraction
    if (!token || token.length === 0) {
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
    next();
  } catch (error) {
    // Log security events but don't leak information
    console.warn(
      "Authentication failed:",
      error instanceof Error ? error.message : "Unknown error",
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
      console.error("Authentication validation error:", error);
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
    const authHeader = req.headers.authorization;

    // Only process if header exists and is properly formatted
    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      const token = authHeader.substring(7).trim();

      // Only proceed if token is not empty
      if (token && token.length > 0) {
        try {
          // Use verifyToken which includes expiration check
          const decoded = JWTManager.verifyToken(token);

          // Validate decoded payload - prevent bypass with incomplete payloads
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
            // Use server-side session validation instead of trusting user-controlled data
            req.user = decoded;
            const isAuthenticated = await SessionService.isAuthenticated(req);
            if (!isAuthenticated) {
              req.user = undefined; // Clear invalid session
            }
          }
        } catch {
          // Invalid token - silently ignore for optional auth
          console.warn("Optional auth failed for token");
        }
      }
    }
  } catch (error) {
    // Log unexpected errors but continue
    console.warn(
      "Optional auth error:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
  next();
};
