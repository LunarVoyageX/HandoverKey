import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user-service";
import { SessionService } from "../services/session-service";
import { JWTManager } from "../auth/jwt";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserRegistration, UserLogin } from "@handoverkey/shared";
import { AuthenticationError, NotFoundError } from "../errors";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Data is already validated and sanitized by Zod middleware
      const { email, password, confirmPassword } = req.body;

      const registration: UserRegistration = {
        email,
        password,
        confirmPassword,
      };

      const user = await UserService.createUser(registration);

      // Log successful registration
      await UserService.logActivity(user.id, "USER_REGISTERED", req.ip);

      // Generate tokens with session tracking
      const { token: accessToken } = await JWTManager.generateAccessToken(
        user.id,
        user.email,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        }
      );
      const refreshToken = JWTManager.generateRefreshToken(user.id, user.email);

      // Set secure cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 60 * 60 * 1000, // 1 hour
      };

      res.cookie("accessToken", accessToken, cookieOptions);

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      // Log failed registration attempt
      if (req.body.email) {
        try {
          const existingUser = await UserService.findUserByEmail(
            req.body.email,
          );
          if (existingUser) {
            await UserService.logActivity(
              existingUser.id,
              "REGISTRATION_FAILED_DUPLICATE_EMAIL",
              req.ip,
            );
          }
        } catch (logError) {
          console.error("Failed to log registration error:", logError);
        }
      }

      // Pass error to global error handler
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Data is already validated and sanitized by Zod middleware
      const { email, password, twoFactorCode } = req.body;

      const login: UserLogin = {
        email,
        password,
        twoFactorCode,
      };

      // First, check if user exists to get userId for lockout check
      const existingUser = await UserService.findUserByEmail(email);
      
      if (existingUser) {
        // Check if account is locked
        const { AccountLockoutService } = await import("../services/account-lockout-service");
        const lockStatus = await AccountLockoutService.isLocked(existingUser.id);
        
        if (lockStatus.isLocked) {
          const timeRemaining = await AccountLockoutService.getTimeUntilUnlock(existingUser.id);
          
          await UserService.logActivity(
            existingUser.id,
            "LOGIN_FAILED_ACCOUNT_LOCKED",
            req.ip
          );
          
          throw new AuthenticationError(
            `Account is locked due to too many failed login attempts. Please try again in ${Math.ceil((timeRemaining || 0) / 60)} minutes.`
          );
        }
      }

      const user = await UserService.authenticateUser(login);

      // Secure 2FA check
      if (user.twoFactorEnabled === true) {
        // 2FA is required - code is already validated by Zod middleware
        if (!twoFactorCode) {
          throw new AuthenticationError("Two-factor authentication required");
        }

        // TODO: Add actual 2FA code verification here
        // For now, we require the code to be present and properly formatted
        // This should be implemented with proper TOTP verification
      }

      // Clear failed login attempts on successful login
      const { AccountLockoutService } = await import("../services/account-lockout-service");
      await AccountLockoutService.clearAttempts(user.id);

      // Log successful login
      await UserService.logActivity(user.id, "USER_LOGIN", req.ip);

      // Generate tokens with session tracking
      const { token: accessToken } = await JWTManager.generateAccessToken(
        user.id,
        user.email,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        }
      );
      const refreshToken = JWTManager.generateRefreshToken(user.id, user.email);

      // Set secure cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 60 * 60 * 1000, // 1 hour
      };

      res.cookie("accessToken", accessToken, cookieOptions);

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          lastActivity: user.lastActivity,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      // Record failed login attempt and check for lockout
      if (req.body.email && error instanceof AuthenticationError) {
        try {
          const existingUser = await UserService.findUserByEmail(req.body.email);
          if (existingUser) {
            // Record failed attempt
            const { AccountLockoutService } = await import("../services/account-lockout-service");
            const lockStatus = await AccountLockoutService.recordFailedAttempt(
              existingUser.id,
              req.ip
            );

            // Log the failed attempt
            await UserService.logActivity(
              existingUser.id,
              lockStatus.isLocked ? "LOGIN_FAILED_ACCOUNT_LOCKED" : "LOGIN_FAILED_INVALID_CREDENTIALS",
              req.ip,
            );

            // If account was just locked, update the error message
            if (lockStatus.isLocked) {
              throw new AuthenticationError(
                `Account locked due to too many failed login attempts. Please try again in ${Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / 60000)} minutes.`
              );
            } else if (lockStatus.attemptsRemaining !== undefined) {
              // Add attempts remaining to error message
              throw new AuthenticationError(
                `Invalid credentials. ${lockStatus.attemptsRemaining} attempt(s) remaining before account lockout.`
              );
            }
          }
        } catch (logError) {
          // If it's an AuthenticationError from lockout, re-throw it
          if (logError instanceof AuthenticationError) {
            throw logError;
          }
          console.error("Failed to log login error:", logError);
        }
      }

      // Pass error to global error handler
      next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use server-side session validation instead of user-controlled data
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      // Invalidate the session in database
      if (req.user?.sessionId) {
        await SessionService.invalidateSession(req.user.sessionId);
      }

      // Log logout (req.user is validated by SessionService)
      await UserService.logActivity(req.user!.userId, "USER_LOGOUT", req.ip);

      // Clear the cookie
      res.clearCookie("accessToken");

      res.json({ message: "Logout successful" });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AuthenticationError("Refresh token is required");
      }

      const decoded = JWTManager.verifyToken(refreshToken);
      const user = await UserService.findUserById(decoded.userId);

      if (!user) {
        throw new AuthenticationError("Invalid refresh token");
      }

      // Generate new tokens with session tracking
      const { token: newAccessToken } = await JWTManager.generateAccessToken(
        user.id,
        user.email,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        }
      );
      const newRefreshToken = JWTManager.generateRefreshToken(
        user.id,
        user.email,
      );

      // Set secure cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 60 * 60 * 1000, // 1 hour
      };

      res.cookie("accessToken", newAccessToken, cookieOptions);

      res.json({
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Use server-side session validation instead of user-controlled data
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      // Server-side validation - fetch user from database (req.user is validated by SessionService)
      const user = await UserService.findUserById(req.user!.userId);

      if (!user) {
        throw new NotFoundError("User");
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          lastActivity: user.lastActivity,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
