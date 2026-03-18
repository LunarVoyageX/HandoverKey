import {
  getDatabaseClient,
  HandoverProcessRepository,
  SuccessorNotificationRepository,
} from "@handoverkey/database";
import {
  HandoverOrchestrator as IHandoverOrchestrator,
  HandoverProcess,
  HandoverProcessStatus,
  ReminderType,
} from "@handoverkey/shared/src/types/dead-mans-switch";
import { NotificationService } from "./notification-service";
import { logger } from "../config/logger";
import { realtimeService } from "./realtime-service";

const GRACE_PERIOD_HOURS = parseInt(process.env.GRACE_PERIOD_HOURS || "48", 10);

export class HandoverOrchestrator implements IHandoverOrchestrator {
  private static getHandoverProcessRepository(): HandoverProcessRepository {
    const dbClient = getDatabaseClient();
    return new HandoverProcessRepository(dbClient.getKysely());
  }

  private static getSuccessorNotificationRepository(): SuccessorNotificationRepository {
    const dbClient = getDatabaseClient();
    return new SuccessorNotificationRepository(dbClient.getKysely());
  }

  /**
   * Initiates the handover process for a user
   */
  async initiateHandover(userId: string): Promise<HandoverProcess> {
    try {
      // Check if there's already an active handover process
      const existingHandover = await this.getActiveHandover(userId);
      if (existingHandover) {
        return existingHandover;
      }

      const now = new Date();
      const gracePeriodEnds = new Date(
        now.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000,
      );

      const metadata = {
        gracePeriodHours: GRACE_PERIOD_HOURS,
        initiatedBy: "inactivity_monitor",
        reason: "inactivity_threshold_exceeded",
      };

      const handoverRepo = HandoverOrchestrator.getHandoverProcessRepository();
      const dbProcess = await handoverRepo.create({
        user_id: userId,
        status: HandoverProcessStatus.GRACE_PERIOD,
        initiated_at: now,
        grace_period_ends: gracePeriodEnds,
        metadata,
      });

      const handoverProcess = this.mapDbToHandoverProcess(dbProcess);

      realtimeService.broadcastToUser(userId, "handover.status_changed", {
        handoverId: handoverProcess.id,
        status: handoverProcess.status,
        gracePeriodEnds: handoverProcess.gracePeriodEnds,
      });

      logger.info(
        `Handover process initiated for user ${userId}, grace period ends: ${gracePeriodEnds.toISOString()}`,
      );

      // Send initial grace period notifications
      const notificationService = new NotificationService();
      await notificationService.sendReminder(
        userId,
        ReminderType.FINAL_WARNING,
      );

      return handoverProcess;
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          `Failed to initiate handover for user ${userId}`,
        );
      }
      throw error;
    }
  }

  /**
   * Cancels an active handover process
   */
  async cancelHandover(userId: string, reason: string): Promise<void> {
    try {
      const handoverRepo = HandoverOrchestrator.getHandoverProcessRepository();
      const activeProcess = await handoverRepo.findActiveByUserId(userId);

      if (!activeProcess) {
        logger.info(`No active handover process found for user ${userId}`);
        return;
      }

      await handoverRepo.update(activeProcess.id, {
        status: HandoverProcessStatus.CANCELLED,
        cancelled_at: new Date(),
        cancellation_reason: reason,
      });

      realtimeService.broadcastToUser(userId, "handover.status_changed", {
        handoverId: activeProcess.id,
        status: HandoverProcessStatus.CANCELLED,
        reason,
      });

      logger.info(`Handover process cancelled for user ${userId}: ${reason}`);

      // Only notify successors if the process had already moved beyond grace period.
      const shouldNotifySuccessors =
        activeProcess.status !== HandoverProcessStatus.GRACE_PERIOD;

      if (shouldNotifySuccessors) {
        try {
          const dbClient = getDatabaseClient();
          const successorRepo = new (
            await import("@handoverkey/database")
          ).SuccessorRepository(dbClient.getKysely());
          const successors = await successorRepo.findByUserId(userId);
          if (successors.length > 0) {
            const notificationService = new NotificationService();
            await notificationService.sendHandoverCancellation(
              userId,
              successors.map((s) => ({
                name: s.name,
                email: s.email,
                encrypted_share: s.encrypted_share,
                verification_token: s.verification_token,
              })),
              reason,
            );
          }
        } catch (notifyError) {
          logger.error(
            { err: notifyError },
            "Failed to send cancellation notifications",
          );
          // Don't fail the cancellation process itself if notification fails
        }
      }
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          `Failed to cancel handover for user ${userId}`,
        );
      }
      throw error;
    }
  }

  /**
   * Processes a successor's response to handover notification
   */
  async processSuccessorResponse(
    handoverId: string,
    successorId: string,
    _response: unknown,
  ): Promise<void> {
    try {
      // TODO: Implement successor response processing
      // This will handle successor verification and consent
      logger.info(
        `Processing successor response for handover ${handoverId}, successor ${successorId}`,
      );

      const notificationRepo =
        HandoverOrchestrator.getSuccessorNotificationRepository();
      await notificationRepo.update(handoverId, successorId, {
        verification_status: "verified",
        verified_at: new Date(),
      });
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          `Failed to process successor response for handover ${handoverId}`,
        );
      }
      throw error;
    }
  }

  /**
   * Gets the current handover status for a user
   */
  async getHandoverStatus(userId: string): Promise<HandoverProcess | null> {
    try {
      return await this.getActiveHandover(userId);
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          `Failed to get handover status for user ${userId}`,
        );
      }
      return null;
    }
  }

  /**
   * Processes grace period expiration
   */
  async processGracePeriodExpiration(handoverId: string): Promise<void> {
    try {
      const handoverRepo = HandoverOrchestrator.getHandoverProcessRepository();
      const process = await handoverRepo.findById(handoverId);

      if (!process || process.status !== HandoverProcessStatus.GRACE_PERIOD) {
        logger.info(
          `Handover ${handoverId} is not in grace period or doesn't exist`,
        );
        return;
      }

      await handoverRepo.update(handoverId, {
        status: HandoverProcessStatus.AWAITING_SUCCESSORS,
      });

      realtimeService.broadcastToUser(
        process.user_id,
        "handover.status_changed",
        {
          handoverId,
          status: HandoverProcessStatus.AWAITING_SUCCESSORS,
        },
      );

      logger.info(
        `Grace period expired for handover ${handoverId}, notifying successors`,
      );

      // Notify successors
      const dbClient = getDatabaseClient();
      const successorRepo = new (
        await import("@handoverkey/database")
      ).SuccessorRepository(dbClient.getKysely());
      const successors = await successorRepo.findByUserId(process.user_id);
      // Notification sent with key share
      const notificationService = new NotificationService();
      await notificationService.sendHandoverAlert(
        process.user_id,
        successors.map((s) => ({
          name: s.name,
          email: s.email,
          encrypted_share: s.encrypted_share,
          verification_token: s.verification_token,
        })),
        handoverId,
      );
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          `Failed to process grace period expiration for handover ${handoverId}`,
        );
      }
      throw error;
    }
  }

  /**
   * Gets all handover processes that need attention
   */
  async getHandoversNeedingAttention(): Promise<HandoverProcess[]> {
    try {
      const handoverRepo = HandoverOrchestrator.getHandoverProcessRepository();

      // Get processes in various active states
      const gracePeriodProcesses = await handoverRepo.findByStatus(
        HandoverProcessStatus.GRACE_PERIOD,
      );
      const awaitingProcesses = await handoverRepo.findByStatus(
        HandoverProcessStatus.AWAITING_SUCCESSORS,
      );
      const verificationProcesses = await handoverRepo.findByStatus(
        HandoverProcessStatus.VERIFICATION_PENDING,
      );

      // Filter grace period processes that have expired
      const now = new Date();
      const expiredGracePeriod = gracePeriodProcesses.filter(
        (p) => new Date(p.grace_period_ends) <= now,
      );

      // Combine all processes that need attention
      const allProcesses = [
        ...expiredGracePeriod,
        ...awaitingProcesses,
        ...verificationProcesses,
      ];

      // Sort by creation date
      allProcesses.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      return allProcesses.map((p) => this.mapDbToHandoverProcess(p));
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        logger.error(
          { err: error },
          "Failed to get handovers needing attention",
        );
      }
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async getActiveHandover(
    userId: string,
  ): Promise<HandoverProcess | null> {
    const handoverRepo = HandoverOrchestrator.getHandoverProcessRepository();
    const dbProcess = await handoverRepo.findActiveByUserId(userId);

    if (!dbProcess) {
      return null;
    }

    return this.mapDbToHandoverProcess(dbProcess);
  }

  private mapDbToHandoverProcess(dbRow: {
    id: string;
    user_id: string;
    status: string;
    initiated_at: Date;
    grace_period_ends: Date;
    completed_at?: Date | null;
    cancelled_at?: Date | null;
    cancellation_reason?: string | null;
    metadata?: unknown;
    created_at: Date;
    updated_at: Date;
  }): HandoverProcess {
    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      status: dbRow.status as HandoverProcessStatus,
      initiatedAt: dbRow.initiated_at,
      gracePeriodEnds: dbRow.grace_period_ends,
      completedAt: dbRow.completed_at ?? undefined,
      cancelledAt: dbRow.cancelled_at ?? undefined,
      cancellationReason: dbRow.cancellation_reason ?? undefined,
      metadata: (dbRow.metadata as Record<string, unknown>) || {},
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }
}
