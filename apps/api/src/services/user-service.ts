import {
  getDatabaseClient,
  UserRepository,
  ActivityRepository,
} from "@handoverkey/database";
import { PasswordUtils } from "../auth/password";
import { User, UserRegistration, UserLogin } from "@handoverkey/shared";
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  NotFoundError,
  EmailVerificationRequiredError,
} from "../errors";
import { getRedisClient } from "../config/redis";
import { emailService } from "./email-service";
import crypto from "crypto";

export class UserService {
  private static getUserRepository(): UserRepository {
    const dbClient = getDatabaseClient();
    return new UserRepository(dbClient.getKysely());
  }

  private static getActivityRepository(): ActivityRepository {
    const dbClient = getDatabaseClient();
    return new ActivityRepository(dbClient.getKysely());
  }

  static async createUser(
    registration: UserRegistration & { salt?: string },
  ): Promise<User> {
    const { name, email, password, salt: providedSalt } = registration;

    // Validate password strength
    // Note: When using client-side hashing, the "password" is a hex string (Auth Key)
    // We might need to relax validation or validate the original password on client side
    // For now, we assume the client sends a strong Auth Key (which is long and random-looking)
    if (password.length < 12) {
      throw new ValidationError("Password must be at least 12 characters long");
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password (Auth Key)
    const passwordHash = await PasswordUtils.hashPassword(password);

    // Use provided salt (encryption salt) or generate a new one (fallback)
    // The provided salt is base64 encoded from the client
    const salt = providedSalt
      ? Buffer.from(providedSalt, "base64")
      : Buffer.from(PasswordUtils.generateSecurePassword(), "utf8");

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const userRepo = this.getUserRepository();
    let dbUser;
    try {
      dbUser = await userRepo.create({
        name: name || null,
        email,
        password_hash: passwordHash,
        salt,
        verification_token: verificationToken,
        email_verified: false,
      });
    } catch (error: unknown) {
      const dbError = error as {
        code?: string;
        originalError?: { code?: string };
      };
      if (dbError.code === "23505" || dbError.originalError?.code === "23505") {
        throw new ConflictError("User with this email already exists");
      }
      throw error;
    }

    // Send verification email (don't fail registration if email fails)
    try {
      await emailService.sendUserVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.warn(
        "Failed to send verification email, but continuing with registration:",
        emailError,
      );
    }

    return this.mapDbUserToUser(dbUser);
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const userRepo = this.getUserRepository();
    const dbUser = await userRepo.findByEmail(email);

    if (!dbUser) {
      return null;
    }

    return this.mapDbUserToUser(dbUser);
  }

  static async findUserById(userId: string): Promise<User | null> {
    const userRepo = this.getUserRepository();
    const dbUser = await userRepo.findById(userId);

    if (!dbUser) {
      return null;
    }

    return this.mapDbUserToUser(dbUser);
  }

  static async authenticateUser(login: UserLogin): Promise<User> {
    const { email, password } = login;

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    const isValidPassword = await PasswordUtils.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new EmailVerificationRequiredError(
        "Please verify your email address before logging in",
      );
    }

    // Update last login
    const userRepo = this.getUserRepository();
    await userRepo.updateLastLogin(user.id);

    return user;
  }

  static async updateLastActivity(userId: string): Promise<void> {
    const userRepo = this.getUserRepository();
    await userRepo.updateLastLogin(userId);
  }

  static async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User> {
    const userRepo = this.getUserRepository();

    // Map camelCase to snake_case for database
    const dbUpdates: Record<string, unknown> = {};

    if (updates.twoFactorEnabled !== undefined) {
      dbUpdates.two_factor_enabled = updates.twoFactorEnabled;
    }
    if (updates.twoFactorSecret !== undefined) {
      dbUpdates.two_factor_secret = updates.twoFactorSecret;
    }

    if (Object.keys(dbUpdates).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    const dbUser = await userRepo.update(userId, dbUpdates);
    return this.mapDbUserToUser(dbUser);
  }

  static async deleteUser(userId: string): Promise<void> {
    const userRepo = this.getUserRepository();
    await userRepo.delete(userId);
  }

  static async logActivity(
    userId: string,
    activityType: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const activityRepo = this.getActivityRepository();
      await activityRepo.create({
        user_id: userId,
        activity_type: activityType,
        ip_address: ipAddress,
      });

      // Also update user's last_activity
      await this.updateLastActivity(userId);
    } catch (error) {
      // Log the error but don't throw - activity logging should not block critical operations
      console.error("Failed to log activity:", error);
    }
  }

  static async verifyEmail(userId: string): Promise<void> {
    const userRepo = this.getUserRepository();
    await userRepo.update(userId, { email_verified: true });
  }

  static async requestPasswordReset(email: string): Promise<void> {
    console.log(`[UserService] Requesting password reset for: ${email}`);
    const user = await this.findUserByEmail(email);
    if (!user) {
      console.log(`[UserService] User not found for email: ${email}`);
      // Don't reveal if user exists
      return;
    }
    console.log(`[UserService] User found: ${user.id}. Generating token...`);

    const token = crypto.randomBytes(32).toString("hex");
    const redis = getRedisClient();

    // Store token in Redis for 1 hour
    await redis.set(`RESET_TOKEN:${token}`, user.id, {
      EX: 3600,
    });

    console.log(`[UserService] Sending password reset email to ${email}...`);
    await emailService.sendPasswordResetEmail(email, token);
    console.log(`[UserService] Password reset email sent.`);
  }

  static async resetPassword(
    token: string,
    newPassword: string,
    newSalt?: string,
    email?: string,
  ): Promise<void> {
    const redis = getRedisClient();
    const userId = await redis.get(`RESET_TOKEN:${token}`);

    if (!userId) {
      throw new ValidationError("Invalid or expired password reset token");
    }

    // If email is provided, validate it matches the user's email
    if (email) {
      const user = await this.findUserById(userId);
      if (!user) {
        throw new ValidationError("User not found");
      }
      if (user.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        throw new ValidationError(
          "Email address does not match the reset token",
        );
      }
    }

    // Validate password strength (Auth Key length check)
    if (newPassword.length < 12) {
      throw new ValidationError("Password must be at least 12 characters long");
    }

    // Hash new password (Auth Key)
    const passwordHash = await PasswordUtils.hashPassword(newPassword);

    // Update user password and salt (if provided)
    const userRepo = this.getUserRepository();
    const updateData: {
      password_hash: string;
      updated_at: Date;
      salt?: Buffer;
      email_verified?: boolean;
      verification_token?: null;
    } = {
      password_hash: passwordHash,
      updated_at: new Date(),
    };

    if (newSalt) {
      updateData.salt = Buffer.from(newSalt, "base64");
    }

    // Since user successfully used password reset token (sent to their email),
    // we can automatically verify their email address
    updateData.email_verified = true;
    updateData.verification_token = null;

    await userRepo.update(userId, updateData);

    // Delete token
    await redis.del(`RESET_TOKEN:${token}`);

    // Log activity (no IP for system operations)
    await this.logActivity(userId, "PASSWORD_RESET");
  }

  static async verifyUserByToken(
    verificationToken: string,
  ): Promise<{ success: boolean; alreadyVerified: boolean; userId?: string }> {
    const userRepo = this.getUserRepository();
    const db = userRepo["db"]; // Access the kysely instance

    // First check if token exists for any user (verified or not)
    const anyUserWithToken = await db
      .selectFrom("users")
      .selectAll()
      .where("verification_token", "=", verificationToken)
      .executeTakeFirst();

    if (anyUserWithToken) {
      if (anyUserWithToken.email_verified) {
        // User is already verified
        return {
          success: true,
          alreadyVerified: true,
          userId: anyUserWithToken.id,
        };
      } else {
        // User exists and is not verified - verify them
        await userRepo.update(anyUserWithToken.id, {
          email_verified: true,
          // Keep the verification token so the link continues to work
        });

        return {
          success: true,
          alreadyVerified: false,
          userId: anyUserWithToken.id,
        };
      }
    }

    // Token not found
    return { success: false, alreadyVerified: false };
  }

  private static mapDbUserToUser(dbUser: {
    id: string;
    email: string;
    name?: string | null;
    password_hash: string;
    salt: Buffer;
    verification_token?: string | null;
    email_verified?: boolean | null;
    two_factor_enabled?: boolean | null;
    two_factor_secret?: string | null;
    last_login?: Date | null;
    failed_login_attempts?: number | null;
    locked_until?: Date | null;
    inactivity_threshold_days?: number | null;
    created_at: Date;
    updated_at: Date;
  }): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || undefined,
      passwordHash: dbUser.password_hash,
      salt: dbUser.salt,
      verificationToken: dbUser.verification_token ?? undefined,
      emailVerified: dbUser.email_verified ?? false,
      twoFactorEnabled: dbUser.two_factor_enabled ?? false,
      twoFactorSecret: dbUser.two_factor_secret ?? undefined,
      lastActivity: dbUser.last_login ?? undefined,
      failedLoginAttempts: dbUser.failed_login_attempts ?? 0,
      lockedUntil: dbUser.locked_until ?? null,
      inactivityThresholdDays: dbUser.inactivity_threshold_days ?? 90,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  static async resendVerificationEmail(
    email: string,
  ): Promise<{ success: boolean; message: string; alreadyVerified?: boolean }> {
    console.log(`[UserService] Resending verification email for: ${email}`);
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.emailVerified) {
      console.log(`[UserService] Email ${email} is already verified`);
      return {
        success: true,
        message: "Email is already verified. You can now login.",
        alreadyVerified: true,
      };
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Update user with new token
    const userRepo = this.getUserRepository();
    await userRepo.update(user.id, {
      verification_token: verificationToken,
      updated_at: new Date(),
    });

    console.log(`[UserService] Sending verification email to ${email}...`);
    await emailService.sendUserVerificationEmail(email, verificationToken);
    console.log(`[UserService] Verification email sent.`);

    return {
      success: true,
      message: "Verification email sent successfully. Please check your email.",
    };
  }
}
