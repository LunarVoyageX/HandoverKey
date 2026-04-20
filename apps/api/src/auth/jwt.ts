import jwt from "jsonwebtoken";
import { SessionService } from "../services/session-service";

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenGenerationOptions {
  ipAddress?: string;
  userAgent?: string;
}

export class JWTManager {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "test") {
        return "test-jwt-secret-please-change-in-production-32";
      }
      throw new Error(
        "JWT_SECRET environment variable is required. Refusing to start with no secret.",
      );
    }
    return secret;
  }

  private static readonly ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN || "1h";
  private static readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  /**
   * Parse a duration string like "1h", "7d", "30m" into milliseconds.
   */
  private static parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 60 * 60 * 1000; // default 1h
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? 60 * 60 * 1000);
  }

  /**
   * Generate access token and create session in database.
   * The token hash stored in the DB matches the final token the client receives.
   */
  static async generateAccessToken(
    userId: string,
    email: string,
    options?: TokenGenerationOptions,
  ): Promise<{ token: string; sessionId: string }> {
    const secret = this.getJwtSecret();

    const durationMs = this.parseDurationMs(this.ACCESS_TOKEN_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + durationMs);

    const sessionId = await SessionService.createSession({
      userId,
      tokenHash: "pending",
      expiresAt,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });

    const finalPayload: JWTPayload = { userId, email, sessionId };
    const token = jwt.sign(finalPayload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);

    const tokenHash = SessionService.hashToken(token);
    await SessionService.updateSessionTokenHash(sessionId, tokenHash);

    return { token, sessionId };
  }

  /**
   * Generate refresh token (no session tracking for refresh tokens)
   */
  static generateRefreshToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      sessionId: "refresh", // Special marker for refresh tokens
    };

    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret()) as JWTPayload;
      return decoded;
    } catch {
      throw new Error("Invalid or expired token");
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return expiration < new Date();
  }
}
