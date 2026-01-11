import {
  getDatabaseClient,
  UserRepository,
  InactivitySettingsRepository,
} from "@handoverkey/database";
import { HandoverProcessStatus } from "@handoverkey/shared/src/types/dead-mans-switch";

export interface InactivitySettings {
  userId: string;
  thresholdDays: number;
  requireMajority: boolean;
  isPaused: boolean;
  pausedUntil?: Date;
}

export class InactivityService {
  private static getUserRepository(): UserRepository {
    const dbClient = getDatabaseClient();
    return new UserRepository(dbClient.getKysely());
  }

  private static getInactivitySettingsRepository(): InactivitySettingsRepository {
    const dbClient = getDatabaseClient();
    return new InactivitySettingsRepository(dbClient.getKysely());
  }

  /**
   * Checks all users for inactivity and initiates handover if needed
   */
  static async checkAllUsers(): Promise<void> {
    console.log("Starting inactivity check for all users...");

    const userRepo = this.getUserRepository();
    const settingsRepo = this.getInactivitySettingsRepository();

    // Get all active inactivity settings
    const allSettings = await settingsRepo.findAllActive();

    console.log(`Checking ${allSettings.length} users for inactivity...`);

    for (const settings of allSettings) {
      const user = await userRepo.findById(settings.user_id);
      if (!user) {
        continue;
      }

      await this.checkUserInactivity({
        id: user.id,
        email: user.email,
        last_activity: user.last_login ?? user.created_at,
        created_at: user.created_at,
        threshold_days: settings.threshold_days,
        is_paused: settings.is_paused,
        paused_until: settings.paused_until,
      });
    }

    // Also check for grace period expirations
    await this.monitorActiveHandovers();

    console.log("Inactivity check completed");
  }

  /**
   * Monitors active handovers for grace period expiration
   */
  static async monitorActiveHandovers(): Promise<void> {
    try {
      const { HandoverOrchestrator } = await import("./handover-orchestrator");
      const orchestrator = new HandoverOrchestrator();

      const processes = await orchestrator.getHandoversNeedingAttention();

      for (const process of processes) {
        // Check if grace period expired
        if (
          process.status === HandoverProcessStatus.GRACE_PERIOD &&
          new Date(process.gracePeriodEnds) <= new Date()
        ) {
          console.log(
            `Processing expired grace period for handover ${process.id}`,
          );
          await orchestrator.processGracePeriodExpiration(process.id);
        }
        // We could also handle other states here
      }
    } catch (error) {
      console.error("Failed to monitor active handovers:", error);
    }
  }

  /**
   * Checks a specific user for inactivity
   */
  /**
   * Checks a specific user for inactivity
   */
  static async checkUserInactivity(user: {
    id: string;
    email: string;
    last_activity: Date | string;
    created_at: Date | string;
    threshold_days: number;
    is_paused: boolean;
    paused_until?: Date | null;
  }): Promise<void> {
    const thresholdDays = user.threshold_days || 90;
    const lastActivity = user.last_activity || user.created_at;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    if (lastActivity && new Date(lastActivity) < thresholdDate) {
      console.log(`User ${user.email} is inactive. Initiating handover...`);

      try {
        const { HandoverOrchestrator } =
          await import("./handover-orchestrator");
        const orchestrator = new HandoverOrchestrator();
        await orchestrator.initiateHandover(user.id);
        console.log(`Handover initiated for user ${user.email}`);
      } catch (error) {
        console.error(
          `Failed to initiate handover for user ${user.email}:`,
          error,
        );
      }
    }
  }

  /**
   * Gets inactivity settings for a user
   */
  static async getSettings(userId: string): Promise<InactivitySettings> {
    const settingsRepo = this.getInactivitySettingsRepository();
    const dbSettings = await settingsRepo.findByUserId(userId);

    if (!dbSettings) {
      // Create default settings
      return await this.createDefaultSettings(userId);
    }

    return {
      userId: dbSettings.user_id,
      thresholdDays: dbSettings.threshold_days,
      requireMajority: dbSettings.require_majority,
      isPaused: dbSettings.is_paused,
      pausedUntil: dbSettings.paused_until ?? undefined,
    };
  }

  /**
   * Updates inactivity settings for a user
   */
  static async updateSettings(
    userId: string,
    updates: Partial<InactivitySettings>,
  ): Promise<InactivitySettings> {
    const settingsRepo = this.getInactivitySettingsRepository();

    // Map camelCase to snake_case for database and filter out non-updatable fields
    const dbUpdates: Record<string, unknown> = {};

    if (updates.thresholdDays !== undefined) {
      dbUpdates.threshold_days = updates.thresholdDays;
    }
    if (updates.requireMajority !== undefined) {
      dbUpdates.require_majority = updates.requireMajority;
    }
    if (updates.isPaused !== undefined) {
      dbUpdates.is_paused = updates.isPaused;
    }
    if (updates.pausedUntil !== undefined) {
      dbUpdates.paused_until = updates.pausedUntil;
    }

    if (Object.keys(dbUpdates).length === 0) {
      throw new Error("No valid fields to update");
    }

    const dbSettings = await settingsRepo.update(userId, dbUpdates);

    return {
      userId: dbSettings.user_id,
      thresholdDays: dbSettings.threshold_days,
      requireMajority: dbSettings.require_majority,
      isPaused: dbSettings.is_paused,
      pausedUntil: dbSettings.paused_until ?? undefined,
    };
  }

  /**
   * Pauses the dead man's switch for a user
   */
  static async pauseSwitch(userId: string, pauseUntil?: Date): Promise<void> {
    const settingsRepo = this.getInactivitySettingsRepository();
    await settingsRepo.update(userId, {
      is_paused: true,
      paused_until: pauseUntil,
    });
  }

  /**
   * Resumes the dead man's switch for a user
   */
  static async resumeSwitch(userId: string): Promise<void> {
    const settingsRepo = this.getInactivitySettingsRepository();
    await settingsRepo.update(userId, {
      is_paused: false,
      paused_until: null,
    });
  }

  private static async createDefaultSettings(
    userId: string,
  ): Promise<InactivitySettings> {
    const settingsRepo = this.getInactivitySettingsRepository();
    const dbSettings = await settingsRepo.create({
      user_id: userId,
      threshold_days: 90,
      notification_methods: ["email"],
      is_paused: false,
    });

    return {
      userId: dbSettings.user_id,
      thresholdDays: dbSettings.threshold_days,
      requireMajority: dbSettings.require_majority,
      isPaused: dbSettings.is_paused,
      pausedUntil: dbSettings.paused_until ?? undefined,
    };
  }
}
