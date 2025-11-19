import {
  getDatabaseClient,
  InactivitySettingsRepository,
  SystemStatusRepository,
  NotificationDeliveryRepository,
  UserRepository,
} from "@handoverkey/database";
import { ActivityService } from "./activity-service";
import { NotificationService } from "./notification-service";
import { HandoverOrchestrator } from "./handover-orchestrator";
import {
  InactivityMonitor,
  ActivityStatus,
  HandoverStatus,
  ReminderType,
  SystemStatusType,
} from "@handoverkey/shared/src/types/dead-mans-switch";

export class InactivityMonitorService implements InactivityMonitor {
  private static instance: InactivityMonitorService;
  private activityService: ActivityService;
  private notificationService: NotificationService;
  private handoverOrchestrator: HandoverOrchestrator;
  private isRunning: boolean = false;
  private intervalId: ReturnType<typeof global.setInterval> | null = null;
  private readonly CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.activityService = new ActivityService();
    this.notificationService = new NotificationService();
    this.handoverOrchestrator = new HandoverOrchestrator();
  }

  static getInstance(): InactivityMonitorService {
    if (!InactivityMonitorService.instance) {
      InactivityMonitorService.instance = new InactivityMonitorService();
    }
    return InactivityMonitorService.instance;
  }

  private static getInactivitySettingsRepository(): InactivitySettingsRepository {
    const dbClient = getDatabaseClient();
    return new InactivitySettingsRepository(dbClient.getKysely());
  }

  private static getSystemStatusRepository(): SystemStatusRepository {
    const dbClient = getDatabaseClient();
    return new SystemStatusRepository(dbClient.getKysely());
  }

  private static getNotificationDeliveryRepository(): NotificationDeliveryRepository {
    const dbClient = getDatabaseClient();
    return new NotificationDeliveryRepository(dbClient.getKysely());
  }

  private static getUserRepository(): UserRepository {
    const dbClient = getDatabaseClient();
    return new UserRepository(dbClient.getKysely());
  }

  /**
   * Starts the inactivity monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log("InactivityMonitor is already running");
      return;
    }

    console.log("Starting InactivityMonitor service...");
    this.isRunning = true;

    // Run initial check
    this.checkAllUsers().catch((error) => {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error("Initial inactivity check failed:", error);
      }
    });

    // Schedule periodic checks
    this.intervalId = global.setInterval(() => {
      this.checkAllUsers().catch((error) => {
        // Only log errors in non-test environments
        if (process.env.NODE_ENV !== "test") {
          console.error("Periodic inactivity check failed:", error);
        }
      });
    }, this.CHECK_INTERVAL_MS);

    console.log(
      `InactivityMonitor started with ${this.CHECK_INTERVAL_MS / 1000}s interval`,
    );
  }

  /**
   * Stops the inactivity monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("InactivityMonitor is not running");
      return;
    }

    console.log("Stopping InactivityMonitor service...");
    this.isRunning = false;

    if (this.intervalId) {
      global.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("InactivityMonitor stopped");
  }

  /**
   * Checks inactivity for a specific user
   */
  async checkUserInactivity(userId: string): Promise<void> {
    try {
      // Skip if system is in maintenance mode
      if (await this.isSystemInMaintenance()) {
        return;
      }

      // Skip if user tracking is paused
      if (await this.isUserTrackingPaused(userId)) {
        return;
      }

      const activityStatus =
        await this.activityService.getUserActivityStatus(userId);
      const inactivitySettings = await this.getInactivitySettings(userId);

      // Adjust for system downtime
      const adjustedStatus = await this.adjustForSystemDowntime(activityStatus);

      await this.processUserInactivity(
        userId,
        adjustedStatus,
        inactivitySettings,
      );
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error(`Failed to check inactivity for user ${userId}:`, error);
      }
      // Continue processing other users even if one fails
    }
  }

  /**
   * Checks inactivity for all users
   */
  async checkAllUsers(): Promise<void> {
    try {
      console.log("Running inactivity check for all users...");

      // Get all active users (users with inactivity settings)
      const users = await this.getActiveUsers();
      console.log(`Checking inactivity for ${users.length} users`);

      // Process users in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map((user) => this.checkUserInactivity(user.id)),
        );

        // Small delay between batches
        if (i + batchSize < users.length) {
          await this.delay(1000); // 1 second delay
        }
      }

      console.log("Completed inactivity check for all users");
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to check inactivity for all users:", error);
      }
    }
  }

  /**
   * Pauses system-wide tracking (for maintenance)
   */
  async pauseSystemTracking(reason: string): Promise<void> {
    try {
      await this.updateSystemStatus(SystemStatusType.MAINTENANCE, reason);
      console.log(`System tracking paused: ${reason}`);
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to pause system tracking:", error);
      }
      throw error;
    }
  }

  /**
   * Resumes system-wide tracking
   */
  async resumeSystemTracking(): Promise<void> {
    try {
      await this.updateSystemStatus(
        SystemStatusType.OPERATIONAL,
        "System resumed",
      );
      console.log("System tracking resumed");
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to resume system tracking:", error);
      }
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async processUserInactivity(
    userId: string,
    activityStatus: ActivityStatus,
    _inactivitySettings: {
      thresholdDays: number;
      notificationMethods: string[];
    },
  ): Promise<void> {
    const { thresholdPercentage, handoverStatus } = activityStatus;

    // Handle different inactivity levels
    if (thresholdPercentage >= 100) {
      // Past threshold - initiate handover if not already started
      if (
        handoverStatus !== HandoverStatus.GRACE_PERIOD &&
        handoverStatus !== HandoverStatus.HANDOVER_ACTIVE
      ) {
        await this.handoverOrchestrator.initiateHandover(userId);
        console.log(
          `Handover initiated for user ${userId} (${thresholdPercentage.toFixed(1)}% inactive)`,
        );
      }
    } else if (thresholdPercentage >= 95) {
      // Final warning (95%)
      await this.sendReminderIfDue(
        userId,
        ReminderType.FINAL_WARNING,
        activityStatus,
      );
    } else if (thresholdPercentage >= 85) {
      // Second reminder (85%)
      await this.sendReminderIfDue(
        userId,
        ReminderType.SECOND_REMINDER,
        activityStatus,
      );
    } else if (thresholdPercentage >= 75) {
      // First reminder (75%)
      await this.sendReminderIfDue(
        userId,
        ReminderType.FIRST_REMINDER,
        activityStatus,
      );
    }

    // Log significant changes
    if (thresholdPercentage >= 75) {
      console.log(
        `User ${userId}: ${thresholdPercentage.toFixed(1)}% inactive, status: ${handoverStatus}`,
      );
    }
  }

  private async sendReminderIfDue(
    userId: string,
    reminderType: ReminderType,
    _activityStatus: ActivityStatus,
  ): Promise<void> {
    try {
      // Check if we've already sent this type of reminder recently
      const lastReminder = await this.getLastReminderSent(userId, reminderType);
      const reminderCooldown = this.getReminderCooldown(reminderType);

      if (
        lastReminder &&
        Date.now() - lastReminder.getTime() < reminderCooldown
      ) {
        return; // Too soon to send another reminder of this type
      }

      // Send the reminder
      const result = await this.notificationService.sendReminder(
        userId,
        reminderType,
      );

      if (result.status === "sent" || result.status === "delivered") {
        console.log(`Sent ${reminderType} reminder to user ${userId}`);
      } else {
        console.error(
          `Failed to send ${reminderType} reminder to user ${userId}:`,
          result.errorMessage,
        );
      }
    } catch (error) {
      console.error(
        `Error sending ${reminderType} reminder to user ${userId}:`,
        error,
      );
    }
  }

  private async getActiveUsers(): Promise<{ id: string }[]> {
    const settingsRepo =
      InactivityMonitorService.getInactivitySettingsRepository();
    const activeSettings = await settingsRepo.findAllActive();
    return activeSettings.map((s) => ({ id: s.user_id }));
  }

  private async getInactivitySettings(userId: string) {
    const settingsRepo =
      InactivityMonitorService.getInactivitySettingsRepository();
    const settings = await settingsRepo.findByUserId(userId);

    if (!settings) {
      // Return default settings
      return {
        thresholdDays: 90,
        notificationMethods: ["email"],
      };
    }

    return {
      thresholdDays: settings.threshold_days,
      notificationMethods: settings.notification_methods || ["email"],
    };
  }

  private async isSystemInMaintenance(): Promise<boolean> {
    const statusRepo = InactivityMonitorService.getSystemStatusRepository();
    const currentStatus = await statusRepo.getCurrent();

    if (!currentStatus) {
      return false;
    }

    return currentStatus.status === SystemStatusType.MAINTENANCE;
  }

  private async isUserTrackingPaused(userId: string): Promise<boolean> {
    const settingsRepo =
      InactivityMonitorService.getInactivitySettingsRepository();
    const settings = await settingsRepo.findByUserId(userId);

    if (!settings) {
      return false;
    }

    // Check if permanently paused
    if (settings.is_paused && !settings.paused_until) {
      return true;
    }

    // Check if temporarily paused and still within pause period
    if (settings.is_paused && settings.paused_until) {
      return new Date() < new Date(settings.paused_until);
    }

    return false;
  }

  private async adjustForSystemDowntime(
    _activityStatus: ActivityStatus,
  ): Promise<ActivityStatus> {
    // Get total system downtime since user's last activity
    const downtimeMs = await this.getSystemDowntimeSince(
      _activityStatus.lastActivity,
    );

    if (downtimeMs === 0) {
      return _activityStatus;
    }

    // Adjust the inactivity duration by subtracting downtime
    const adjustedInactivityDuration = Math.max(
      0,
      _activityStatus.inactivityDuration - downtimeMs,
    );

    // Recalculate other fields based on adjusted duration
    const thresholdMs =
      _activityStatus.timeRemaining + _activityStatus.inactivityDuration;
    const adjustedThresholdPercentage = Math.min(
      (adjustedInactivityDuration / thresholdMs) * 100,
      100,
    );
    const adjustedTimeRemaining = Math.max(
      0,
      thresholdMs - adjustedInactivityDuration,
    );

    return {
      ..._activityStatus,
      inactivityDuration: adjustedInactivityDuration,
      thresholdPercentage: adjustedThresholdPercentage,
      timeRemaining: adjustedTimeRemaining,
    };
  }

  private async getSystemDowntimeSince(since: Date): Promise<number> {
    const statusRepo = InactivityMonitorService.getSystemStatusRepository();
    const downtimeRecords = await statusRepo.getDowntimeSince(since);

    let totalDowntime = 0;

    for (const record of downtimeRecords) {
      if (record.downtime_start && record.downtime_end) {
        const start = new Date(record.downtime_start);
        const end = new Date(record.downtime_end);
        totalDowntime += end.getTime() - start.getTime();
      }
    }

    return totalDowntime;
  }

  private async updateSystemStatus(
    status: SystemStatusType,
    reason: string,
  ): Promise<void> {
    const statusRepo = InactivityMonitorService.getSystemStatusRepository();
    const now = new Date();

    if (
      status === SystemStatusType.MAINTENANCE ||
      status === SystemStatusType.OUTAGE
    ) {
      // Starting downtime
      await statusRepo.create({
        status,
        downtime_start: now,
        reason,
      });
    } else {
      // Ending downtime
      await statusRepo.endCurrentDowntime();

      // Insert new operational status
      await statusRepo.create({
        status,
        reason,
      });
    }
  }

  private async getLastReminderSent(
    userId: string,
    reminderType: ReminderType,
  ): Promise<Date | null> {
    const deliveryRepo =
      InactivityMonitorService.getNotificationDeliveryRepository();
    const lastDelivery = await deliveryRepo.findLastByType(
      userId,
      reminderType,
    );

    if (!lastDelivery) {
      return null;
    }

    return new Date(lastDelivery.created_at);
  }

  private getReminderCooldown(reminderType: ReminderType): number {
    // Cooldown periods to prevent spam
    switch (reminderType) {
      case ReminderType.FIRST_REMINDER:
        return 24 * 60 * 60 * 1000; // 24 hours
      case ReminderType.SECOND_REMINDER:
        return 12 * 60 * 60 * 1000; // 12 hours
      case ReminderType.FINAL_WARNING:
        return 6 * 60 * 60 * 1000; // 6 hours
      default:
        return 60 * 60 * 1000; // 1 hour
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }

  /**
   * Health check method
   */
  isHealthy(): boolean {
    return this.isRunning;
  }

  /**
   * Get monitoring statistics
   */
  async getStats(): Promise<{
    isRunning: boolean;
    checkInterval: number;
    activeUsers: number;
    systemStatus: string;
  }> {
    const activeUsers = await this.getActiveUsers();
    const systemStatus = await this.getCurrentSystemStatus();

    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL_MS,
      activeUsers: activeUsers.length,
      systemStatus: systemStatus || "unknown",
    };
  }

  private async getCurrentSystemStatus(): Promise<string | null> {
    const statusRepo = InactivityMonitorService.getSystemStatusRepository();
    const currentStatus = await statusRepo.getCurrent();
    return currentStatus ? currentStatus.status : null;
  }
}
