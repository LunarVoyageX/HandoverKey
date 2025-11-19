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
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
  private static readonly ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN || "1h";
  private static readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  /**
   * Generate access token and create session in database
   */
  static async generateAccessToken(
    userId: string,
    email: string,
    options?: TokenGenerationOptions,
  ): Promise<{ token: string; sessionId: string }> {
    const payload: JWTPayload = {
      userId,
      email,
      sessionId: "", // Will be set after session creation
    };

    // Generate token without sessionId first to get expiration
    const tempToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);

    const expiration = this.getTokenExpiration(tempToken);
    if (!expiration) {
      throw new Error("Failed to get token expiration");
    }

    // Create session in database
    const tokenHash = SessionService.hashToken(tempToken);
    const sessionId = await SessionService.createSession({
      userId,
      tokenHash,
      expiresAt: expiration,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });

    // Generate final token with sessionId
    payload.sessionId = sessionId;
    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);

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

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
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
