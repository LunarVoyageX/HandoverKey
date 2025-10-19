import { DatabaseConnection } from "../database/connection";

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

    const query = `
      INSERT INTO handover_processes (user_id, status, initiated_at, grace_period_ends, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, [
      userId,
      "GRACE_PERIOD",
      now,
      gracePeriodEnds,
      now,
    ]);

    const handover = result.rows[0];
    return this.mapHandoverFromDb(handover);
  }

  /**
   * Gets active handover process for a user
   */
  static async getActiveHandover(
    userId: string,
  ): Promise<HandoverProcess | null> {
    const query = `
      SELECT * FROM handover_processes 
      WHERE user_id = $1 AND status IN ('GRACE_PERIOD', 'PENDING_CONFIRMATION')
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapHandoverFromDb(result.rows[0]);
  }

  /**
   * Cancels an active handover process
   */
  static async cancelHandover(userId: string): Promise<boolean> {
    const query = `
      UPDATE handover_processes 
      SET status = 'CANCELLED', completed_at = NOW()
      WHERE user_id = $1 AND status IN ('GRACE_PERIOD', 'PENDING_CONFIRMATION')
    `;

    const result = await DatabaseConnection.query(query, [userId]);
    return result.rowCount > 0;
  }

  /**
   * Completes the handover process
   */
  static async completeHandover(handoverId: string): Promise<boolean> {
    const query = `
      UPDATE handover_processes 
      SET status = 'COMPLETED', completed_at = NOW()
      WHERE id = $1 AND status = 'PENDING_CONFIRMATION'
    `;

    const result = await DatabaseConnection.query(query, [handoverId]);
    return result.rowCount > 0;
  }

  /**
   * Gets all expired grace periods that need to be processed
   */
  static async getExpiredGracePeriods(): Promise<HandoverProcess[]> {
    const query = `
      SELECT * FROM handover_processes 
      WHERE status = 'GRACE_PERIOD' AND grace_period_ends <= NOW()
      ORDER BY grace_period_ends ASC
    `;

    const result = await DatabaseConnection.query(query);
    return result.rows.map(this.mapHandoverFromDb);
  }

  /**
   * Moves handover from grace period to pending confirmation
   */
  static async moveToConfirmation(handoverId: string): Promise<boolean> {
    const query = `
      UPDATE handover_processes 
      SET status = 'PENDING_CONFIRMATION'
      WHERE id = $1 AND status = 'GRACE_PERIOD'
    `;

    const result = await DatabaseConnection.query(query, [handoverId]);
    return result.rowCount > 0;
  }

  private static mapHandoverFromDb(row: any): HandoverProcess {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      initiatedAt: row.initiated_at,
      gracePeriodEnds: row.grace_period_ends,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    };
  }
}
