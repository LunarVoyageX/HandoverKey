import { Kysely } from "kysely";
import { Database, ActivityRecord, NewActivityRecord } from "../types";
import { QueryError } from "../errors";

export class ActivityRepository {
  constructor(private db: Kysely<Database>) {}

  async create(
    data: Omit<NewActivityRecord, "signature" | "client_type"> & {
      action?: string;
      success?: boolean;
    },
  ): Promise<ActivityRecord> {
    try {
      // Map legacy fields if present
      const activityType = data.activity_type || data.action || "UNKNOWN";

      const record = await this.db
        .insertInto("activity_records")
        .values({
          user_id: data.user_id,
          activity_type: activityType,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
          metadata: data.metadata,
          client_type: "web",
          signature: "pending-implementation", // TODO: Implement HMAC signature
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return record;
    } catch (error) {
      throw new QueryError(
        `Failed to create activity record: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<ActivityRecord[]> {
    try {
      const logs = await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return logs;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByAction(
    userId: string,
    action: string,
    limit: number = 100,
  ): Promise<ActivityRecord[]> {
    try {
      const logs = await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .where("activity_type", "=", action)
        .orderBy("created_at", "desc")
        .limit(limit)
        .execute();

      return logs;
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records by action: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findFailedLogins(
    userId: string,
    since: Date,
  ): Promise<ActivityRecord[]> {
    try {
      const logs = await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .where("activity_type", "like", "LOGIN_FAILED%")
        .where("created_at", ">=", since)
        .orderBy("created_at", "desc")
        .execute();

      return logs;
    } catch (error) {
      throw new QueryError(
        `Failed to find failed logins: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const result = await this.db
        .deleteFrom("activity_records")
        .where("created_at", "<", date)
        .executeTakeFirst();

      return Number(result.numDeletedRows);
    } catch (error) {
      throw new QueryError(
        `Failed to delete old activity records: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
