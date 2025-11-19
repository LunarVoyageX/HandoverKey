import { Kysely } from "kysely";
import { Database, SystemStatus, NewSystemStatus } from "../types";
import { QueryError } from "../errors";

export class SystemStatusRepository {
  constructor(private db: Kysely<Database>) {}

  async create(data: NewSystemStatus): Promise<SystemStatus> {
    try {
      const status = await this.db
        .insertInto("system_status")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return status;
    } catch (error) {
      throw new QueryError(
        `Failed to create system status: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getCurrent(): Promise<SystemStatus | null> {
    try {
      const status = await this.db
        .selectFrom("system_status")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(1)
        .executeTakeFirst();

      return status ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to get current system status: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getDowntimeSince(since: Date): Promise<SystemStatus[]> {
    try {
      const statuses = await this.db
        .selectFrom("system_status")
        .selectAll()
        .where("status", "in", ["maintenance", "outage"])
        .where("downtime_start", ">=", since)
        .where("downtime_end", "is not", null)
        .orderBy("downtime_start", "asc")
        .execute();

      return statuses;
    } catch (error) {
      throw new QueryError(
        `Failed to get downtime since date: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async endCurrentDowntime(): Promise<void> {
    try {
      await this.db
        .updateTable("system_status")
        .set({ downtime_end: new Date() })
        .where("id", "=", (eb) =>
          eb
            .selectFrom("system_status")
            .select("id")
            .where("status", "in", ["maintenance", "outage"])
            .where("downtime_end", "is", null)
            .orderBy("created_at", "desc")
            .limit(1),
        )
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to end current downtime: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
