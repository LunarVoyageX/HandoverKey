import { Kysely } from "kysely";
import { Database, ActivityRecord, NewActivityRecord } from "../types";
import { QueryError } from "../errors";
import { createHash } from "crypto";

function computeSignature(data: {
  user_id: string;
  activity_type: string;
  ip_address?: string | null;
}): string {
  const payload = `${data.user_id}:${data.activity_type}:${data.ip_address || ""}:${Date.now()}`;
  return createHash("sha256").update(payload).digest("hex");
}

export class ActivityRepository {
  constructor(private db: Kysely<Database>) {}

  async create(
    data: Omit<NewActivityRecord, "signature" | "client_type"> & {
      action?: string;
      success?: boolean;
      client_type?: string;
      signature?: string;
    },
  ): Promise<ActivityRecord> {
    try {
      const activityType = data.activity_type || data.action || "UNKNOWN";

      const record = await this.db
        .insertInto("activity_records")
        .values({
          user_id: data.user_id,
          activity_type: activityType,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
          metadata: data.metadata,
          client_type: data.client_type || "web",
          signature:
            data.signature ||
            computeSignature({ ...data, activity_type: activityType }),
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
      return await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findLastActivity(userId: string): Promise<ActivityRecord | null> {
    try {
      const record = await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(1)
        .executeTakeFirst();

      return record ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find last activity: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      return await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .where("activity_type", "=", action)
        .orderBy("created_at", "desc")
        .limit(limit)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records by action: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByActivityType(
    userId: string,
    activityType: string,
    limit: number = 100,
  ): Promise<ActivityRecord[]> {
    return this.findByAction(userId, activityType, limit);
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    activityTypes?: string[],
  ): Promise<ActivityRecord[]> {
    try {
      let query = this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", startDate)
        .where("created_at", "<=", endDate);

      if (activityTypes && activityTypes.length > 0) {
        query = query.where("activity_type", "in", activityTypes);
      }

      return await query.orderBy("created_at", "desc").execute();
    } catch (error) {
      throw new QueryError(
        `Failed to find activity records by date range: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async countByUserId(userId: string): Promise<number> {
    try {
      const result = await this.db
        .selectFrom("activity_records")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("user_id", "=", userId)
        .executeTakeFirstOrThrow();

      return Number(result.count);
    } catch (error) {
      throw new QueryError(
        `Failed to count activity records: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findFailedLogins(
    userId: string,
    since: Date,
  ): Promise<ActivityRecord[]> {
    try {
      return await this.db
        .selectFrom("activity_records")
        .selectAll()
        .where("user_id", "=", userId)
        .where("activity_type", "like", "LOGIN_FAILED%")
        .where("created_at", ">=", since)
        .orderBy("created_at", "desc")
        .execute();
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

/**
 * @deprecated Use ActivityRepository instead. This alias exists for backward compatibility.
 */
export const ActivityRecordsRepository = ActivityRepository;
