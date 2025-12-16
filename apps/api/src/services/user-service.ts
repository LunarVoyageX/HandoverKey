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

    const userRepo = this.getUserRepository();
    let dbUser;
    try {
      dbUser = await userRepo.create({
        name: name || null,
        email,
        password_hash: passwordHash,
        salt,
      });
    } catch (error: any) {
      if (error.code === "23505" || error.originalError?.code === "23505") {
        throw new ConflictError("User with this email already exists");
      }
      throw error;
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
  ): Promise<void> {
    const redis = getRedisClient();
    const userId = await redis.get(`RESET_TOKEN:${token}`);

    if (!userId) {
      throw new ValidationError("Invalid or expired password reset token");
    }

    // Validate password strength (Auth Key length check)
    if (newPassword.length < 12) {
      throw new ValidationError("Password must be at least 12 characters long");
    }

    // Hash new password (Auth Key)
    const passwordHash = await PasswordUtils.hashPassword(newPassword);

    // Update user password and salt (if provided)
    const userRepo = this.getUserRepository();
    const updateData: any = {
      password_hash: passwordHash,
      updated_at: new Date(),
    };

    if (newSalt) {
      updateData.salt = Buffer.from(newSalt, "base64");
    }

    await userRepo.update(userId, updateData);

    // Delete token
    await redis.del(`RESET_TOKEN:${token}`);

    // Log activity
    await this.logActivity(userId, "PASSWORD_RESET", "system");
  }

  private static mapDbUserToUser(dbUser: {
    id: string;
    email: string;
    name?: string | null;
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
      name: dbUser.name || undefined,
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
