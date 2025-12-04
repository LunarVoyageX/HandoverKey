import { createHmac } from "crypto";
import {
  getDatabaseClient,
  ActivityRecordsRepository,
  InactivitySettingsRepository,
  HandoverProcessRepository,
  UserRepository,
} from "@handoverkey/database";
import {
  ActivityRecord,
  ActivityStatus,
  ActivityType,
  ClientType,
  HandoverStatus,
  ActivityTracker,
} from "@handoverkey/shared/src/types/dead-mans-switch";

export class ActivityService implements ActivityTracker {
  private static readonly HMAC_SECRET =
    process.env.ACTIVITY_HMAC_SECRET || "default-secret-change-in-production";
  private static readonly SIGNATURE_ALGORITHM = "sha256";

  private static getActivityRecordsRepository(): ActivityRecordsRepository {
    const dbClient = getDatabaseClient();
    return new ActivityRecordsRepository(dbClient.getKysely());
  }

  private static getInactivitySettingsRepository(): InactivitySettingsRepository {
    const dbClient = getDatabaseClient();
    return new InactivitySettingsRepository(dbClient.getKysely());
  }

  private static getHandoverProcessRepository(): HandoverProcessRepository {
    const dbClient = getDatabaseClient();
    return new HandoverProcessRepository(dbClient.getKysely());
  }

  private static getUserRepository(): UserRepository {
    const dbClient = getDatabaseClient();
    return new UserRepository(dbClient.getKysely());
  }

  /**
   * Records user activity with cryptographic integrity
   */
  async recordActivity(
    userId: string,
    activityType: ActivityType,
    metadata?: Record<string, unknown>,
    clientType: ClientType = ClientType.WEB,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const timestamp = new Date();

    // Create activity data for signature
    const activityData = {
      userId,
      activityType,
      clientType,
      timestamp: timestamp.toISOString(),
      metadata: metadata || {},
    };

    // Generate HMAC signature for integrity
    const signature = this.generateActivitySignature(activityData);

    const activityRepo = ActivityService.getActivityRecordsRepository();
    await activityRepo.create({
      user_id: userId,
      activity_type: activityType,
      client_type: clientType,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata || {},
      signature,
      created_at: timestamp,
    });

    // Also update the user's last_login timestamp for backward compatibility
    if (activityType === ActivityType.LOGIN) {
      const userRepo = ActivityService.getUserRepository();
      await userRepo.updateLastLogin(userId);
    }
  }

  /**
   * Gets the most recent activity for a user across all client types
   */
  async getLastActivity(userId: string): Promise<ActivityRecord | null> {
    const activityRepo = ActivityService.getActivityRecordsRepository();
    const dbRecord = await activityRepo.findLastActivity(userId);

    if (!dbRecord) {
      return null;
    }

    return this.mapDbRecordToActivityRecord(dbRecord);
  }

  /**
   * Gets comprehensive activity status for a user
   */
  async getUserActivityStatus(userId: string): Promise<ActivityStatus> {
    const lastActivity = await this.getLastActivity(userId);
    const inactivitySettings = await this.getInactivitySettings(userId);
    const activeHandover = await this.getActiveHandover(userId);

    if (!lastActivity) {
      // User has never been active - use account creation date
      const user = await this.getUserById(userId);
      const createdAt = user?.createdAt || new Date();

      return {
        lastActivity: createdAt,
        inactivityDuration: Date.now() - createdAt.getTime(),
        thresholdPercentage: this.calculateThresholdPercentage(
          Date.now() - createdAt.getTime(),
          inactivitySettings.thresholdDays,
        ),
        nextReminderDue: this.calculateNextReminderDue(
          createdAt,
          inactivitySettings.thresholdDays,
        ),
        handoverStatus: this.determineHandoverStatus(
          Date.now() - createdAt.getTime(),
          inactivitySettings.thresholdDays,
          activeHandover,
        ),
        timeRemaining: this.calculateTimeRemaining(
          createdAt,
          inactivitySettings.thresholdDays,
        ),
      };
    }

    const inactivityDuration = Date.now() - lastActivity.createdAt.getTime();
    const thresholdPercentage = this.calculateThresholdPercentage(
      inactivityDuration,
      inactivitySettings.thresholdDays,
    );

    return {
      lastActivity: lastActivity.createdAt,
      inactivityDuration,
      thresholdPercentage,
      nextReminderDue: this.calculateNextReminderDue(
        lastActivity.createdAt,
        inactivitySettings.thresholdDays,
      ),
      handoverStatus: this.determineHandoverStatus(
        inactivityDuration,
        inactivitySettings.thresholdDays,
        activeHandover,
      ),
      timeRemaining: this.calculateTimeRemaining(
        lastActivity.createdAt,
        inactivitySettings.thresholdDays,
      ),
    };
  }

  /**
   * Pauses activity tracking for a user
   */
  async pauseTracking(
    userId: string,
    reason: string,
    until?: Date,
  ): Promise<void> {
    const settingsRepo = ActivityService.getInactivitySettingsRepository();
    await settingsRepo.update(userId, {
      is_paused: true,
      pause_reason: reason,
      paused_until: until,
    });

    // Record the pause as an activity
    await this.recordActivity(userId, ActivityType.SETTINGS_CHANGE, {
      action: "pause_tracking",
      reason,
      until,
    });
  }

  /**
   * Resumes activity tracking for a user
   */
  async resumeTracking(userId: string): Promise<void> {
    const settingsRepo = ActivityService.getInactivitySettingsRepository();
    await settingsRepo.update(userId, {
      is_paused: false,
      pause_reason: null,
      paused_until: null,
    });

    // Record the resume as an activity
    await this.recordActivity(userId, ActivityType.SETTINGS_CHANGE, {
      action: "resume_tracking",
    });
  }

  /**
   * Verifies the integrity of an activity record
   */
  async verifyActivityIntegrity(
    activityRecord: ActivityRecord,
  ): Promise<boolean> {
    const activityData = {
      userId: activityRecord.userId,
      activityType: activityRecord.activityType,
      clientType: activityRecord.clientType,
      timestamp: activityRecord.createdAt.toISOString(),
      metadata: activityRecord.metadata || {},
    };

    const expectedSignature = this.generateActivitySignature(activityData);
    return expectedSignature === activityRecord.signature;
  }

  /**
   * Gets activity history for a user with pagination
   */
  async getActivityHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date,
    activityTypes?: ActivityType[],
  ): Promise<{ activities: ActivityRecord[]; total: number }> {
    const activityRepo = ActivityService.getActivityRecordsRepository();

    let dbRecords;
    if (startDate && endDate) {
      dbRecords = await activityRepo.findByDateRange(
        userId,
        startDate,
        endDate,
        activityTypes,
      );
    } else {
      dbRecords = await activityRepo.findByUserId(userId, limit, offset);
    }

    const activities = dbRecords.map((record) =>
      this.mapDbRecordToActivityRecord(record),
    );

    const total = await activityRepo.countByUserId(userId);

    return { activities, total };
  }

  /**
   * Private helper methods
   */
  private generateActivitySignature(
    activityData: Record<string, unknown>,
  ): string {
    const dataString = JSON.stringify(
      activityData,
      Object.keys(activityData).sort(),
    );
    return createHmac(
      ActivityService.SIGNATURE_ALGORITHM,
      ActivityService.HMAC_SECRET,
    )
      .update(dataString)
      .digest("hex");
  }

  private async getInactivitySettings(userId: string) {
    const settingsRepo = ActivityService.getInactivitySettingsRepository();
    const settings = await settingsRepo.findByUserId(userId);

    if (!settings) {
      // Return default settings if none exist
      return {
        thresholdDays: 90,
        isPaused: false,
      };
    }

    return {
      thresholdDays: settings.threshold_days,
      isPaused: settings.is_paused,
      pausedUntil: settings.paused_until,
    };
  }

  private async getActiveHandover(userId: string) {
    const handoverRepo = ActivityService.getHandoverProcessRepository();
    const process = await handoverRepo.findActiveByUserId(userId);
    return process;
  }

  private async getUserById(userId: string) {
    const userRepo = ActivityService.getUserRepository();
    const user = await userRepo.findById(userId);
    return user
      ? {
          id: user.id,
          createdAt: user.created_at,
        }
      : null;
  }

  private calculateThresholdPercentage(
    inactivityDuration: number,
    thresholdDays: number,
  ): number {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    return Math.min((inactivityDuration / thresholdMs) * 100, 100);
  }

  private calculateNextReminderDue(
    lastActivity: Date,
    thresholdDays: number,
  ): Date | null {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const firstReminderThreshold = thresholdMs * 0.75; // 75%

    const timeSinceActivity = Date.now() - lastActivity.getTime();

    if (timeSinceActivity < firstReminderThreshold) {
      return new Date(lastActivity.getTime() + firstReminderThreshold);
    }

    // If we're past 75%, calculate next reminder based on current percentage
    const percentage = (timeSinceActivity / thresholdMs) * 100;

    if (percentage < 85) {
      return new Date(lastActivity.getTime() + thresholdMs * 0.85);
    } else if (percentage < 95) {
      return new Date(lastActivity.getTime() + thresholdMs * 0.95);
    } else if (percentage < 100) {
      return new Date(lastActivity.getTime() + thresholdMs);
    }

    return null; // Past threshold, no more reminders
  }

  private determineHandoverStatus(
    inactivityDuration: number,
    thresholdDays: number,
    activeHandover: unknown,
  ): HandoverStatus {
    if (activeHandover) {
      const handover = activeHandover as { status: string };
      switch (handover.status) {
        case "grace_period":
        case "GRACE_PERIOD":
          return HandoverStatus.GRACE_PERIOD;
        case "awaiting_successors":
        case "verification_pending":
        case "ready_for_transfer":
          return HandoverStatus.HANDOVER_ACTIVE;
        default:
          break;
      }
    }

    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const percentage = (inactivityDuration / thresholdMs) * 100;

    if (percentage >= 100) {
      return HandoverStatus.GRACE_PERIOD;
    } else if (percentage >= 75) {
      return HandoverStatus.REMINDER_PHASE;
    }

    return HandoverStatus.NORMAL;
  }

  private calculateTimeRemaining(
    lastActivity: Date,
    thresholdDays: number,
  ): number {
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - lastActivity.getTime();
    return Math.max(0, thresholdMs - elapsed);
  }

  private mapDbRecordToActivityRecord(dbRecord: {
    id: string;
    user_id: string;
    activity_type: string;
    client_type: string;
    ip_address?: string | null;
    user_agent?: string | null;
    metadata?: unknown;
    signature: string;
    created_at: Date;
  }): ActivityRecord {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      activityType: dbRecord.activity_type as ActivityType,
      clientType: dbRecord.client_type as ClientType,
      ipAddress: dbRecord.ip_address || undefined,
      userAgent: dbRecord.user_agent || undefined,
      metadata: (dbRecord.metadata as Record<string, unknown>) || {},
      signature: dbRecord.signature,
      createdAt: dbRecord.created_at,
    };
  }
}
