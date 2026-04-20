import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user-service";
import { SessionService } from "../services/session-service";
import { SuccessorService } from "../services/successor-service";
import { emailService } from "../services/email-service";
import { JWTManager } from "../auth/jwt";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserRegistration, UserLogin } from "@handoverkey/shared";
import {
  AuthenticationError,
  NotFoundError,
  EmailVerificationRequiredError,
} from "../errors";

function getCookieDomain(): string | undefined {
  return process.env.COOKIE_DOMAIN || undefined;
}

function cookieOpts(maxAgeMs: number, path?: string) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "lax" : "strict") as "lax" | "strict",
    ...(isProd && { domain: getCookieDomain() }),
    ...(path && { path }),
    maxAge: maxAgeMs,
  };
}

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Data is already validated and sanitized by Zod middleware
      const { name, email, password, confirmPassword, salt } = req.body;

      const registration: UserRegistration & { salt?: string } = {
        name,
        email,
        password,
        confirmPassword,
        salt,
      };

      const user = await UserService.createUser(registration);

      // Log successful registration
      await UserService.logActivity(user.id, "USER_REGISTERED", req.ip);

      res.status(201).json({
        message:
          "User registered successfully. Please check your email to verify your account before logging in.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
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
        } catch {
          // Activity logging should not block the error response
        }
      }

      // Pass error to global error handler
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Data is already validated and sanitized by Zod middleware
      const { email, password, twoFactorCode, recoveryCode } = req.body;

      const login: UserLogin = {
        email,
        password,
        twoFactorCode,
        recoveryCode,
      };

      // First, check if user exists to get userId for lockout check
      const existingUser = await UserService.findUserByEmail(email);

      if (existingUser) {
        // Check if account is locked
        const { AccountLockoutService } =
          await import("../services/account-lockout-service");
        const lockStatus = await AccountLockoutService.isLocked(
          existingUser.id,
        );

        if (lockStatus.isLocked) {
          const timeRemaining = await AccountLockoutService.getTimeUntilUnlock(
            existingUser.id,
          );

          await UserService.logActivity(
            existingUser.id,
            "LOGIN_FAILED_ACCOUNT_LOCKED",
            req.ip,
          );

          throw new AuthenticationError(
            `Account is locked due to too many failed login attempts. Please try again in ${Math.ceil((timeRemaining || 0) / 60)} minutes.`,
          );
        }
      }

      const user = await UserService.authenticateUser(login);

      // Secure 2FA check
      if (user.twoFactorEnabled === true) {
        await UserService.verifyTwoFactorChallenge({
          userId: user.id,
          twoFactorSecret: user.twoFactorSecret,
          twoFactorRecoveryCodes: user.twoFactorRecoveryCodes,
          twoFactorCode,
          recoveryCode,
        });
      }

      // Clear failed login attempts on successful login
      const { AccountLockoutService } =
        await import("../services/account-lockout-service");
      await AccountLockoutService.clearAttempts(user.id);

      // Log successful login
      await UserService.logActivity(user.id, "USER_LOGIN", req.ip);

      // If the user checks in by logging in during grace period, cancel handover.
      const { HandoverOrchestrator } =
        await import("../services/handover-orchestrator");
      const orchestrator = new HandoverOrchestrator();
      await orchestrator.cancelHandover(
        user.id,
        "User activity detected: successful login",
      );

      // Generate tokens with session tracking
      const { token: accessToken } = await JWTManager.generateAccessToken(
        user.id,
        user.email,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      );
      const refreshToken = JWTManager.generateRefreshToken(user.id, user.email);

      res.cookie("accessToken", accessToken, cookieOpts(60 * 60 * 1000));
      res.cookie(
        "refreshToken",
        refreshToken,
        cookieOpts(7 * 24 * 60 * 60 * 1000, "/api/v1/auth/refresh"),
      );

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          twoFactorEnabled: user.twoFactorEnabled,
          lastActivity: user.lastActivity,
          salt: Buffer.from(user.salt).toString("base64"),
        },
      });
    } catch (error) {
      // Record failed login attempt and check for lockout
      // Skip failed login recording for email verification required errors
      if (
        req.body.email &&
        error instanceof AuthenticationError &&
        !(error instanceof EmailVerificationRequiredError)
      ) {
        try {
          const existingUser = await UserService.findUserByEmail(
            req.body.email,
          );
          if (existingUser) {
            // Record failed attempt
            const { AccountLockoutService } =
              await import("../services/account-lockout-service");
            const lockStatus = await AccountLockoutService.recordFailedAttempt(
              existingUser.id,
              req.ip,
            );

            // Log the failed attempt
            await UserService.logActivity(
              existingUser.id,
              lockStatus.isLocked
                ? "LOGIN_FAILED_ACCOUNT_LOCKED"
                : "LOGIN_FAILED_INVALID_CREDENTIALS",
              req.ip,
            );

            // If account was just locked, update the error message
            if (lockStatus.isLocked) {
              throw new AuthenticationError(
                `Account locked due to too many failed login attempts. Please try again in ${Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / 60000)} minutes.`,
              );
            } else if (lockStatus.attemptsRemaining !== undefined) {
              // Add attempts remaining to error message
              throw new AuthenticationError(
                `Invalid credentials. ${lockStatus.attemptsRemaining} attempt(s) remaining before account lockout.`,
              );
            }
          }
        } catch (logError) {
          // If it's an AuthenticationError from lockout, re-throw it
          if (logError instanceof AuthenticationError) {
            throw logError;
          }
        }
      }

      // Pass error to global error handler
      next(error);
    }
  }

  static async setupTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      const setup = await UserService.createTwoFactorSetup(req.user!.userId);
      await UserService.logActivity(
        req.user!.userId,
        "TWO_FACTOR_SETUP_INITIATED",
        req.ip,
      );

      res.json({
        message: "Two-factor setup generated. Verify a code to enable it.",
        qrCodeDataUrl: setup.qrCodeDataUrl,
        otpauthUrl: setup.otpauthUrl,
        recoveryCodes: setup.recoveryCodes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async enableTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      const { token } = req.body;
      await UserService.enableTwoFactor(req.user!.userId, token);
      await UserService.logActivity(
        req.user!.userId,
        "TWO_FACTOR_ENABLED",
        req.ip,
      );

      res.json({
        message: "Two-factor authentication enabled successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async disableTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      const { currentPassword, token, recoveryCode } = req.body;
      await UserService.disableTwoFactor(
        req.user!.userId,
        currentPassword,
        token,
        recoveryCode,
      );
      await UserService.logActivity(
        req.user!.userId,
        "TWO_FACTOR_DISABLED",
        req.ip,
      );

      res.json({
        message: "Two-factor authentication disabled successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(
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

      // Invalidate the session in database
      if (req.user?.sessionId) {
        await SessionService.invalidateSession(req.user.sessionId);
      }

      // Log logout (req.user is validated by SessionService)
      await UserService.logActivity(req.user!.userId, "USER_LOGOUT", req.ip);

      res.clearCookie("accessToken", cookieOpts(0));
      res.clearCookie("refreshToken", cookieOpts(0, "/api/v1/auth/refresh"));

      res.json({ message: "Logout successful" });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        throw new AuthenticationError("Refresh token is required");
      }

      const decoded = JWTManager.verifyToken(refreshToken);
      const user = await UserService.findUserById(decoded.userId);

      if (!user) {
        throw new AuthenticationError("Invalid refresh token");
      }

      const { token: newAccessToken } = await JWTManager.generateAccessToken(
        user.id,
        user.email,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      );
      const newRefreshToken = JWTManager.generateRefreshToken(
        user.id,
        user.email,
      );

      res.cookie("accessToken", newAccessToken, cookieOpts(60 * 60 * 1000));
      res.cookie(
        "refreshToken",
        newRefreshToken,
        cookieOpts(7 * 24 * 60 * 60 * 1000, "/api/v1/auth/refresh"),
      );

      res.json({ message: "Token refreshed successfully" });
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
          name: user.name,
          twoFactorEnabled: user.twoFactorEnabled,
          lastActivity: user.lastActivity,
          createdAt: user.createdAt,
          salt: Buffer.from(user.salt).toString("base64"),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      const { name } = req.body;
      const updatedUser = await UserService.updateProfile(
        req.user!.userId,
        name,
      );
      await UserService.logActivity(
        req.user!.userId,
        "PROFILE_UPDATED",
        req.ip,
      );

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          twoFactorEnabled: updatedUser.twoFactorEnabled,
          lastActivity: updatedUser.lastActivity,
          createdAt: updatedUser.createdAt,
          salt: Buffer.from(updatedUser.salt).toString("base64"),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      const { currentPassword, newPassword, newSalt, reEncryptedEntries } =
        req.body;

      await UserService.changePasswordAndReEncryptVault(
        req.user!.userId,
        currentPassword,
        newPassword,
        newSalt,
        reEncryptedEntries,
      );

      // Invalidate all sessions after password change.
      await SessionService.invalidateAllUserSessions(req.user!.userId);
      res.clearCookie("accessToken", cookieOpts(0));
      res.clearCookie("refreshToken", cookieOpts(0, "/api/v1/auth/refresh"));

      res.json({
        message:
          "Password changed successfully. Please sign in again on this device.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email } = req.body;
      await UserService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const isAuthenticated = await SessionService.isAuthenticated(req);
      if (!isAuthenticated) {
        throw new AuthenticationError("Not authenticated");
      }

      // Get user details before deletion to send email
      const user = await UserService.findUserById(req.user!.userId);

      // Get verified successors to notify
      const successors = await SuccessorService.getSuccessors(req.user!.userId);
      const verifiedSuccessors = successors.filter((s) => s.verified);

      await UserService.deleteUser(req.user!.userId);
      await SessionService.invalidateAllUserSessions(req.user!.userId);

      // Send confirmation email to user
      if (user) {
        // Fire and forget - don't await to keep response fast
        emailService
          .sendAccountDeletionConfirmation(user.email, user.name || "User")
          .catch(() => {});

        verifiedSuccessors.forEach((successor) => {
          emailService
            .sendAccountDeletionToSuccessors(
              successor.email,
              user.name || user.email,
            )
            .catch(() => {});
        });
      }

      res.clearCookie("accessToken", cookieOpts(0));
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token, password, salt, email } = req.body;
      await UserService.resetPassword(token, password, salt, email);

      res.json({
        message: "Password has been reset successfully. You can now login.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        res.status(400).json({ message: "Verification token is required" });
        return;
      }

      const result = await UserService.verifyUserByToken(token);

      if (!result.success) {
        res.status(400).json({
          message: "Invalid or expired verification token",
        });
        return;
      }

      if (result.alreadyVerified) {
        res.json({
          message: "Email already verified. You can now login.",
        });
        return;
      }

      res.json({
        message: "Email verified successfully. You can now login.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      const result = await UserService.resendVerificationEmail(email);

      res.json({
        message: result.message,
        alreadyVerified: result.alreadyVerified,
      });
    } catch (error) {
      next(error);
    }
  }
}
