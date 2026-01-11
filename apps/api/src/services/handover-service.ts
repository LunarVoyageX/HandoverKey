import {
  getDatabaseClient,
  HandoverProcessRepository,
  SuccessorRepository,
} from "@handoverkey/database";
import { NotificationService } from "./notification-service";

export interface HandoverProcess {
  id: string;
  userId: string;
  status: "GRACE_PERIOD" | "PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED";
  initiatedAt: Date;
  gracePeriodEnds: Date;
  completedAt?: Date;
  createdAt: Date;
}

export class HandoverService {
  private static readonly GRACE_PERIOD_DAYS = 7;

  private static getHandoverProcessRepository(): HandoverProcessRepository {
    const dbClient = getDatabaseClient();
    return new HandoverProcessRepository(dbClient.getKysely());
  }

  private static getSuccessorRepository(): SuccessorRepository {
    const dbClient = getDatabaseClient();
    return new SuccessorRepository(dbClient.getKysely());
  }

  /**
   * Initiates the handover process for a user
   */
  static async initiateHandover(userId: string): Promise<HandoverProcess> {
    // Check if there's already an active handover process
    const existingHandover = await this.getActiveHandover(userId);
    if (existingHandover) {
      console.log(`Handover already active for user ${userId}`);
      return existingHandover;
    }

    const now = new Date();
    const gracePeriodEnds = new Date(
      now.getTime() + this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    const handoverRepo = this.getHandoverProcessRepository();
    const dbProcess = await handoverRepo.create({
      user_id: userId,
      status: "GRACE_PERIOD",
      initiated_at: now,
      grace_period_ends: gracePeriodEnds,
    });

    // Notify successors
    const successorRepo = this.getSuccessorRepository();
    const successors = await successorRepo.findByUserId(userId);

    if (successors.length > 0) {
      const notificationService = new NotificationService();
      await notificationService.sendHandoverAlert(
        userId,
        successors.map((s) => ({
          name: s.name,
          email: s.email,
          encrypted_share: s.encrypted_share,
        })),
        dbProcess.id,
      );
    }

    return this.mapHandoverFromDb(dbProcess);
  }

  /**
   * Gets active handover process for a user
   */
  static async getActiveHandover(
    userId: string,
  ): Promise<HandoverProcess | null> {
    const handoverRepo = this.getHandoverProcessRepository();
    const dbProcess = await handoverRepo.findActiveByUserId(userId);

    if (!dbProcess) {
      return null;
    }

    return this.mapHandoverFromDb(dbProcess);
  }

  /**
   * Cancels an active handover process
   */
  static async cancelHandover(userId: string): Promise<boolean> {
    const handoverRepo = this.getHandoverProcessRepository();
    const activeProcess = await handoverRepo.findActiveByUserId(userId);

    if (!activeProcess) {
      return false;
    }

    await handoverRepo.update(activeProcess.id, {
      status: "CANCELLED",
      completed_at: new Date(),
    });

    return true;
  }

  /**
   * Completes the handover process
   */
  static async completeHandover(handoverId: string): Promise<boolean> {
    const handoverRepo = this.getHandoverProcessRepository();

    try {
      await handoverRepo.update(handoverId, {
        status: "COMPLETED",
        completed_at: new Date(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets all expired grace periods that need to be processed
   */
  static async getExpiredGracePeriods(): Promise<HandoverProcess[]> {
    const handoverRepo = this.getHandoverProcessRepository();
    const dbProcesses = await handoverRepo.findExpiredGracePeriods();
    return dbProcesses.map(this.mapHandoverFromDb);
  }

  /**
   * Moves handover from grace period to pending confirmation
   */
  static async moveToConfirmation(handoverId: string): Promise<boolean> {
    const handoverRepo = this.getHandoverProcessRepository();

    try {
      await handoverRepo.update(handoverId, {
        status: "PENDING_CONFIRMATION",
      });
      return true;
    } catch {
      return false;
    }
  }

  private static mapHandoverFromDb(row: {
    id: string;
    user_id: string;
    status: string;
    initiated_at: Date;
    grace_period_ends: Date;
    completed_at?: Date | null;
    created_at: Date;
  }): HandoverProcess {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status as
        | "GRACE_PERIOD"
        | "PENDING_CONFIRMATION"
        | "COMPLETED"
        | "CANCELLED",
      initiatedAt: row.initiated_at,
      gracePeriodEnds: row.grace_period_ends,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
    };
  }
}
