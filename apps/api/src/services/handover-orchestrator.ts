import {
  getDatabaseClient,
  HandoverProcessRepository,
  SuccessorNotificationRepository,
} from "@handoverkey/database";
import {
  HandoverOrchestrator as IHandoverOrchestrator,
  HandoverProcess,
  HandoverProcessStatus,
} from "@handoverkey/shared/src/types/dead-mans-switch";

export class HandoverOrchestrator implements IHandoverOrchestrator {
  private static readonly GRACE_PERIOD_HOURS = 48;

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
        console.log(`Handover already active for user ${userId}`);
        return existingHandover;
      }

      const now = new Date();
      const gracePeriodEnds = new Date(
        now.getTime() +
          HandoverOrchestrator.GRACE_PERIOD_HOURS * 60 * 60 * 1000,
      );

      const metadata = {
        gracePeriodHours: HandoverOrchestrator.GRACE_PERIOD_HOURS,
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

      console.log(
        `Handover process initiated for user ${userId}, grace period ends: ${gracePeriodEnds.toISOString()}`,
      );

      // TODO: Send initial grace period notifications
      // TODO: Schedule grace period monitoring

      return handoverProcess;
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error(`Failed to initiate handover for user ${userId}:`, error);
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
        console.log(`No active handover process found for user ${userId}`);
        return;
      }

      await handoverRepo.update(activeProcess.id, {
        status: HandoverProcessStatus.CANCELLED,
        cancelled_at: new Date(),
        cancellation_reason: reason,
      });

      console.log(`Handover process cancelled for user ${userId}: ${reason}`);

      // TODO: Send cancellation notifications to successors if they were already notified
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error(`Failed to cancel handover for user ${userId}:`, error);
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
      console.log(
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
        console.error(
          `Failed to process successor response for handover ${handoverId}:`,
          error,
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
        console.error(
          `Failed to get handover status for user ${userId}:`,
          error,
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
        console.log(
          `Handover ${handoverId} is not in grace period or doesn't exist`,
        );
        return;
      }

      await handoverRepo.update(handoverId, {
        status: HandoverProcessStatus.AWAITING_SUCCESSORS,
      });

      console.log(
        `Grace period expired for handover ${handoverId}, notifying successors`,
      );

      // TODO: Notify successors
      // TODO: Begin successor verification process
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== "test") {
        console.error(
          `Failed to process grace period expiration for handover ${handoverId}:`,
          error,
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
        "verification_pending",
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
        console.error("Failed to get handovers needing attention:", error);
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
