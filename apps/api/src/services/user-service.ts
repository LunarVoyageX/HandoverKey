import {
  getDatabaseClient,
  UserRepository,
  ActivityRepository,
} from "@handoverkey/database";
import { PasswordUtils } from "../auth/password";
import { User, UserRegistration, UserLogin } from "@handoverkey/shared";
import { ValidationError, ConflictError, AuthenticationError } from "../errors";
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

  static async createUser(registration: UserRegistration): Promise<User> {
    const { email, password } = registration;

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`,
      );
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);
    const salt = Buffer.from(PasswordUtils.generateSecurePassword(), "utf8");

    const userRepo = this.getUserRepository();
    const dbUser = await userRepo.create({
      email,
      password_hash: passwordHash,
      salt,
    });

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
    const user = await this.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const redis = getRedisClient();

    // Store token in Redis for 1 hour
    await redis.set(`RESET_TOKEN:${token}`, user.id, {
      EX: 3600,
    });

    await emailService.sendPasswordResetEmail(email, token);
  }

  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const redis = getRedisClient();
    const userId = await redis.get(`RESET_TOKEN:${token}`);

    if (!userId) {
      throw new ValidationError("Invalid or expired password reset token");
    }

    // Validate new password
    const passwordValidation =
      PasswordUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`,
      );
    }

    // Hash new password
    const passwordHash = await PasswordUtils.hashPassword(newPassword);

    // Update user password
    const userRepo = this.getUserRepository();
    await userRepo.update(userId, {
      password_hash: passwordHash,
      updated_at: new Date(),
    });

    // Delete token
    await redis.del(`RESET_TOKEN:${token}`);

    // Log activity
    await this.logActivity(userId, "PASSWORD_RESET", "system");
  }

  private static mapDbUserToUser(dbUser: {
    id: string;
    email: string;
    password_hash: string;
    salt: Buffer;
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
      passwordHash: dbUser.password_hash,
      salt: dbUser.salt,
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
}
