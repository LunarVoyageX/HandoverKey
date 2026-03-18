import {
  getDatabaseClient,
  UserRepository,
  SuccessorRepository,
  CheckinTokenRepository,
  NotificationDeliveryRepository,
  InactivitySettingsRepository,
} from "@handoverkey/database";
import {
  NotificationService as INotificationService,
  NotificationResult,
  ReminderType,
  NotificationMethod,
  DeliveryStatus,
  CheckInValidation,
} from "@handoverkey/shared/src/types/dead-mans-switch";
import { createHash, randomBytes } from "crypto";
import { emailService } from "./email-service";
import { logger } from "../config/logger";
import { realtimeService } from "./realtime-service";

export class NotificationService implements INotificationService {
  private static getUserRepository(): UserRepository {
    const dbClient = getDatabaseClient();
    return new UserRepository(dbClient.getKysely());
  }

  private static getSuccessorRepository(): SuccessorRepository {
    const dbClient = getDatabaseClient();
    return new SuccessorRepository(dbClient.getKysely());
  }

  private static getCheckinTokenRepository(): CheckinTokenRepository {
    const dbClient = getDatabaseClient();
    return new CheckinTokenRepository(dbClient.getKysely());
  }

  private static getNotificationDeliveryRepository(): NotificationDeliveryRepository {
    const dbClient = getDatabaseClient();
    return new NotificationDeliveryRepository(dbClient.getKysely());
  }

  private static getInactivitySettingsRepository(): InactivitySettingsRepository {
    const dbClient = getDatabaseClient();
    return new InactivitySettingsRepository(dbClient.getKysely());
  }

  /**
   * Sends a reminder notification to a user
   */
  async sendReminder(
    userId: string,
    reminderType: ReminderType,
  ): Promise<NotificationResult> {
    try {
      // Get user's notification preferences
      await this.getUserNotificationSettings(userId);
      const user = await this.getUserById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Generate check-in link for the reminder
      const checkInLink = await this.generateCheckInLink(
        userId,
        7 * 24 * 60 * 60 * 1000,
      ); // 7 days

      // Create notification content based on reminder type
      const content = this.createReminderContent(
        reminderType,
        user.email,
        checkInLink,
      );

      // Send via primary notification method (email for now)
      const result = await this.sendEmailNotification(
        user.email,
        content.subject,
        content.html,
      );

      // Record the notification delivery
      await this.recordNotificationDelivery({
        userId,
        notificationType: reminderType,
        method: NotificationMethod.EMAIL,
        recipient: user.email,
        status: result.status,
        errorMessage: result.errorMessage,
      });

      realtimeService.broadcastToUser(userId, "notification.reminder_sent", {
        reminderType,
        recipient: user.email,
      });

      return {
        id: result.id,
        userId,
        method: NotificationMethod.EMAIL,
        status: result.status,
        timestamp: new Date(),
        retryCount: 0,
        errorMessage: result.errorMessage,
      };
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          `Failed to send ${reminderType} reminder to user ${userId}`,
        );
      }

      // Record failed delivery
      await this.recordNotificationDelivery({
        userId,
        notificationType: reminderType,
        method: NotificationMethod.EMAIL,
        recipient: "unknown",
        status: DeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        id: `failed-${Date.now()}`,
        userId,
        method: NotificationMethod.EMAIL,
        status: DeliveryStatus.FAILED,
        timestamp: new Date(),
        retryCount: 0,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sends handover alerts to successors
   */
  async sendHandoverAlert(
    userId: string,
    successors: {
      name: string | null;
      email: string;
      encrypted_share?: string | null;
      verification_token?: string | null;
    }[],
    handoverProcessId?: string,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const successor of successors) {
      try {
        const content = this.createHandoverAlertContent(
          successor.name || "Successor",
          successor.email,
          successor.encrypted_share,
          successor.verification_token,
        );

        const result = await this.sendEmailNotification(
          successor.email,
          content.subject,
          content.html,
        );

        await this.recordNotificationDelivery({
          userId,
          notificationType: ReminderType.HANDOVER_INITIATED,
          method: NotificationMethod.EMAIL,
          recipient: successor.email,
          status: result.status,
          errorMessage: result.errorMessage,
          handoverProcessId,
        });

        results.push({
          id: result.id,
          userId,
          method: NotificationMethod.EMAIL,
          status: result.status,
          timestamp: new Date(),
          retryCount: 0,
          errorMessage: result.errorMessage,
        });
      } catch (error) {
        // Only log errors in non-test environments
        if (process.env.NODE_ENV !== "test") {
          logger.error(
            { err: error },
            `Failed to send handover alert to successor ${successor.email}`,
          );
        }

        results.push({
          id: `failed-${Date.now()}-${successor.email}`,
          userId,
          method: NotificationMethod.EMAIL,
          status: DeliveryStatus.FAILED,
          timestamp: new Date(),
          retryCount: 0,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Sends handover cancellation notifications to successors
   */
  async sendHandoverCancellation(
    userId: string,
    successors: {
      name: string | null;
      email: string;
      encrypted_share?: string | null;
      verification_token?: string | null;
    }[],
    reason: string,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const successor of successors) {
      try {
        const content = this.createHandoverCancellationContent(
          successor.name || "Successor",
          reason,
        );

        const result = await this.sendEmailNotification(
          successor.email,
          content.subject,
          content.html,
        );

        // Record the notification delivery
        await this.recordNotificationDelivery({
          userId,
          method: NotificationMethod.EMAIL,
          notificationType: ReminderType.HANDOVER_CANCELLED,
          status: result.status,
          recipient: successor.email,
          errorMessage: result.errorMessage,
        });

        results.push({
          id: result.id,
          userId,
          method: NotificationMethod.EMAIL,
          status: result.status,
          timestamp: new Date(),
          retryCount: 0,
          errorMessage: result.errorMessage,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          logger.error(
            { err: error },
            `Failed to send handover cancellation to successor ${successor.email}`,
          );
        }

        results.push({
          id: `failed-${Date.now()}`,
          userId,
          method: NotificationMethod.EMAIL,
          status: DeliveryStatus.FAILED,
          timestamp: new Date(),
          retryCount: 0,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Generates a secure check-in link
   */
  async generateCheckInLink(
    userId: string,
    expiresIn: number,
  ): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + expiresIn);

    // Store the token hash in database
    const tokenRepo = NotificationService.getCheckinTokenRepository();
    await tokenRepo.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // Return the check-in URL (token is not hashed in URL)
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return `${baseUrl}/checkin?token=${token}`;
  }

  /**
   * Validates a check-in link token
   */
  async validateCheckInLink(token: string): Promise<CheckInValidation> {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");

      const tokenRepo = NotificationService.getCheckinTokenRepository();
      const tokenData = await tokenRepo.findByTokenHash(tokenHash);

      if (!tokenData) {
        return {
          isValid: false,
          error: "Invalid check-in token",
        };
      }

      // Check if token is expired
      if (new Date() > new Date(tokenData.expires_at)) {
        return {
          isValid: false,
          error: "Check-in token has expired",
        };
      }

      // Check if token has already been used
      if (tokenData.used_at) {
        return {
          isValid: false,
          error: "Check-in token has already been used",
        };
      }

      return {
        isValid: true,
        userId: tokenData.user_id,
        remainingTime: new Date(tokenData.expires_at).getTime() - Date.now(),
      };
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error({ err: error }, "Error validating check-in token");
      }
      return {
        isValid: false,
        error: "Failed to validate check-in token",
      };
    }
  }

  /**
   * Marks a check-in token as used
   */
  async markCheckInTokenUsed(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const tokenRepo = NotificationService.getCheckinTokenRepository();
    await tokenRepo.markAsUsed(tokenHash, ipAddress, userAgent);
  }

  /**
   * Private helper methods
   */

  private async sendEmailNotification(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ id: string; status: DeliveryStatus; errorMessage?: string }> {
    try {
      // Use the actual email service
      await emailService.sendEmail(to, subject, html);

      const randomId = randomBytes(6).toString("hex");
      return {
        id: `email-${Date.now()}-${randomId}`,
        status: DeliveryStatus.SENT,
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to send notification email");
      return {
        id: `failed-${Date.now()}`,
        status: DeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private createReminderContent(
    reminderType: ReminderType,
    userEmail: string,
    checkInLink: string,
  ): { subject: string; html: string } {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const dashboardLink = `${baseUrl}/login`;
    const year = new Date().getFullYear().toString();

    const render = (heading: string, message: string) =>
      emailService.renderTemplate("inactivity-reminder", {
        heading,
        message,
        checkInLink,
        dashboardLink,
        year,
      });

    switch (reminderType) {
      case ReminderType.FIRST_REMINDER:
        return {
          subject: "HandoverKey Activity Reminder - 75% Threshold Reached",
          html: render(
            "Friendly Activity Reminder",
            `Your account (${userEmail}) reached 75% of the inactivity threshold. Check in now to keep your handover workflow paused.`,
          ),
        };

      case ReminderType.SECOND_REMINDER:
        return {
          subject: "HandoverKey Activity Reminder - 85% Threshold Reached",
          html: render(
            "Action Recommended",
            `Your account (${userEmail}) reached 85% of the inactivity threshold. Please check in soon to avoid triggering handover safeguards.`,
          ),
        };

      case ReminderType.FINAL_WARNING:
        return {
          subject: "URGENT: HandoverKey Final Warning - 95% Threshold Reached",
          html: render(
            "Urgent Final Warning",
            `Your account (${userEmail}) reached 95% of the inactivity threshold. Immediate check-in is required to prevent handover initiation.`,
          ),
        };

      default:
        return {
          subject: "HandoverKey Activity Reminder",
          html: render(
            "Account Activity Reminder",
            `This is a reminder for your account (${userEmail}). Please check in to confirm activity.`,
          ),
        };
    }
  }

  private createHandoverAlertContent(
    successorName: string,
    _successorEmail: string,
    encryptedShare?: string | null,
    verificationToken?: string | null,
  ): { subject: string; html: string } {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const successorAccessLink = verificationToken
      ? `${baseUrl}/successor-access?token=${verificationToken}`
      : `${baseUrl}/verify-successor`;
    const shareSection = encryptedShare
      ? `YOUR KEY SHARE:\n${encryptedShare}\n\nStore this securely.`
      : "No key share was attached to this notification.";

    const securityWarning = encryptedShare
      ? "Security warning: this share is sensitive. Store it in a secure channel."
      : "If you expected a key share, contact support.";

    return {
      subject: "HandoverKey: Digital Asset Handover Initiated",
      html: emailService.renderTemplate("handover-alert", {
        successorName,
        successorAccessLink,
        shareSection,
        securitySection: securityWarning,
        year: new Date().getFullYear().toString(),
      }),
    };
  }

  private createHandoverCancellationContent(
    successorName: string,
    reason: string,
  ): { subject: string; html: string } {
    return {
      subject: "HandoverKey: Digital Asset Handover CANCELLED",
      html: emailService.renderTemplate("handover-cancellation", {
        successorName,
        reason,
        year: new Date().getFullYear().toString(),
      }),
    };
  }

  private async getUserNotificationSettings(userId: string) {
    const settingsRepo = NotificationService.getInactivitySettingsRepository();
    const settings = await settingsRepo.findByUserId(userId);

    if (!settings) {
      return { notificationMethods: ["email"] };
    }

    return {
      notificationMethods: settings.notification_methods || ["email"],
    };
  }

  private async getUserById(userId: string) {
    const userRepo = NotificationService.getUserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  private async getSuccessorById(successorId: string) {
    const successorRepo = NotificationService.getSuccessorRepository();
    const successor = await successorRepo.findById(successorId);

    if (!successor) {
      return null;
    }

    return {
      id: successor.id,
      name: successor.name || "Successor",
      email: successor.email,
      encryptedShare: successor.encrypted_share,
    };
  }

  private async recordNotificationDelivery(delivery: {
    userId: string;
    notificationType: ReminderType;
    method: NotificationMethod;
    recipient: string;
    status: DeliveryStatus;
    errorMessage?: string;
    handoverProcessId?: string;
  }): Promise<void> {
    const deliveryRepo =
      NotificationService.getNotificationDeliveryRepository();
    await deliveryRepo.create({
      user_id: delivery.userId,
      notification_type: delivery.notificationType,
      method: delivery.method,
      recipient: delivery.recipient,
      status: delivery.status,
      error_message: delivery.errorMessage ?? null,
      handover_process_id: delivery.handoverProcessId,
    });
  }
}
