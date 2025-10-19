import { DatabaseConnection } from "../database/connection";
import { HandoverService } from "./handover-service";

export interface InactivitySettings {
  userId: string;
  thresholdDays: number;
  requireMajority: boolean;
  isPaused: boolean;
  pausedUntil?: Date;
}

export class InactivityService {
  /**
   * Checks all users for inactivity and initiates handover if needed
   */
  static async checkAllUsers(): Promise<void> {
    console.log("Starting inactivity check for all users...");

    const query = `
      SELECT u.id, u.email, u.last_activity, hs.threshold_days, hs.is_paused, hs.paused_until
      FROM users u
      LEFT JOIN handover_settings hs ON u.id = hs.user_id
      WHERE u.email_verified = true
        AND (hs.is_paused = false OR hs.paused_until < NOW())
    `;

    const result = await DatabaseConnection.query(query);
    const users = result.rows;

    console.log(`Checking ${users.length} users for inactivity...`);

    for (const user of users) {
      await this.checkUserInactivity(user);
    }

    console.log("Inactivity check completed");
  }

  /**
   * Checks a specific user for inactivity
   */
  static async checkUserInactivity(user: any): Promise<void> {
    const thresholdDays = user.threshold_days || 90;
    const lastActivity = user.last_activity || user.created_at;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    if (new Date(lastActivity) < thresholdDate) {
      console.log(`User ${user.email} is inactive. Initiating handover...`);

      try {
        await HandoverService.initiateHandover(user.id);
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
    const query = `
      SELECT * FROM handover_settings WHERE user_id = $1
    `;

    const result = await DatabaseConnection.query(query, [userId]);

    if (result.rows.length === 0) {
      // Create default settings
      return await this.createDefaultSettings(userId);
    }

    const settings = result.rows[0];
    return {
      userId: settings.user_id,
      thresholdDays: settings.threshold_days,
      requireMajority: settings.require_majority,
      isPaused: settings.is_paused,
      pausedUntil: settings.paused_until,
    };
  }

  /**
   * Updates inactivity settings for a user
   */
  static async updateSettings(
    userId: string,
    updates: Partial<InactivitySettings>,
  ): Promise<InactivitySettings> {
    const allowedFields = [
      "threshold_days",
      "require_majority",
      "is_paused",
      "paused_until",
    ];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    updateFields.push("updated_at = NOW()");
    values.push(userId);

    const query = `
      UPDATE handover_settings 
      SET ${updateFields.join(", ")}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, values);
    const settings = result.rows[0];

    return {
      userId: settings.user_id,
      thresholdDays: settings.threshold_days,
      requireMajority: settings.require_majority,
      isPaused: settings.is_paused,
      pausedUntil: settings.paused_until,
    };
  }

  /**
   * Pauses the dead man's switch for a user
   */
  static async pauseSwitch(userId: string, pauseUntil?: Date): Promise<void> {
    const query = `
      UPDATE handover_settings 
      SET is_paused = true, paused_until = $2, updated_at = NOW()
      WHERE user_id = $1
    `;

    await DatabaseConnection.query(query, [userId, pauseUntil]);
  }

  /**
   * Resumes the dead man's switch for a user
   */
  static async resumeSwitch(userId: string): Promise<void> {
    const query = `
      UPDATE handover_settings 
      SET is_paused = false, paused_until = NULL, updated_at = NOW()
      WHERE user_id = $1
    `;

    await DatabaseConnection.query(query, [userId]);
  }

  private static async createDefaultSettings(
    userId: string,
  ): Promise<InactivitySettings> {
    const query = `
      INSERT INTO handover_settings (user_id, threshold_days, require_majority, is_paused)
      VALUES ($1, 90, false, false)
      RETURNING *
    `;

    const result = await DatabaseConnection.query(query, [userId]);
    const settings = result.rows[0];

    return {
      userId: settings.user_id,
      thresholdDays: settings.threshold_days,
      requireMajority: settings.require_majority,
      isPaused: settings.is_paused,
      pausedUntil: settings.paused_until,
    };
  }
}
