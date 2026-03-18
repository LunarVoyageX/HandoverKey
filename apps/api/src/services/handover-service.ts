import {
  getDatabaseClient,
  HandoverProcessRepository,
} from "@handoverkey/database";
import {
  HandoverProcessStatus,
  type HandoverProcess as OrchestratedHandoverProcess,
} from "@handoverkey/shared/src/types/dead-mans-switch";
import { HandoverOrchestrator } from "./handover-orchestrator";

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
  private static getHandoverProcessRepository(): HandoverProcessRepository {
    const dbClient = getDatabaseClient();
    return new HandoverProcessRepository(dbClient.getKysely());
  }

  private static getOrchestrator(): HandoverOrchestrator {
    return new HandoverOrchestrator();
  }

  /**
   * Initiates the handover process for a user
   */
  static async initiateHandover(userId: string): Promise<HandoverProcess> {
    const process = await this.getOrchestrator().initiateHandover(userId);
    return this.mapOrchestratedProcess(process);
  }

  /**
   * Gets active handover process for a user
   */
  static async getActiveHandover(
    userId: string,
  ): Promise<HandoverProcess | null> {
    const process = await this.getOrchestrator().getHandoverStatus(userId);
    return process ? this.mapOrchestratedProcess(process) : null;
  }

  /**
   * Cancels an active handover process
   */
  static async cancelHandover(userId: string): Promise<boolean> {
    const active = await this.getActiveHandover(userId);
    if (!active) {
      return false;
    }

    await this.getOrchestrator().cancelHandover(userId, "Cancelled by user");
    return true;
  }

  /**
   * Completes the handover process
   */
  static async completeHandover(handoverId: string): Promise<boolean> {
    const handoverRepo = this.getHandoverProcessRepository();

    try {
      await handoverRepo.update(handoverId, {
        status: HandoverProcessStatus.COMPLETED,
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
        status: HandoverProcessStatus.VERIFICATION_PENDING,
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
    const status = String(row.status).toLowerCase();
    const mappedStatus =
      status === HandoverProcessStatus.GRACE_PERIOD
        ? "GRACE_PERIOD"
        : status === HandoverProcessStatus.CANCELLED
          ? "CANCELLED"
          : status === HandoverProcessStatus.COMPLETED
            ? "COMPLETED"
            : "PENDING_CONFIRMATION";

    return {
      id: row.id,
      userId: row.user_id,
      status: mappedStatus,
      initiatedAt: row.initiated_at,
      gracePeriodEnds: row.grace_period_ends,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
    };
  }

  private static mapOrchestratedProcess(
    process: OrchestratedHandoverProcess,
  ): HandoverProcess {
    const status = String(process.status).toLowerCase();
    const mappedStatus =
      status === HandoverProcessStatus.GRACE_PERIOD
        ? "GRACE_PERIOD"
        : status === HandoverProcessStatus.CANCELLED
          ? "CANCELLED"
          : status === HandoverProcessStatus.COMPLETED
            ? "COMPLETED"
            : "PENDING_CONFIRMATION";

    return {
      id: process.id,
      userId: process.userId,
      status: mappedStatus,
      initiatedAt: process.initiatedAt,
      gracePeriodEnds: process.gracePeriodEnds,
      completedAt: process.completedAt,
      createdAt: process.createdAt,
    };
  }
}
