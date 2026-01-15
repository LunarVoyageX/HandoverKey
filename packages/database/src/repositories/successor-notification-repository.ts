import { Kysely } from "kysely";
import {
  Database,
  SuccessorNotification,
  NewSuccessorNotification,
  SuccessorNotificationUpdate,
} from "../types";
import { NotFoundError, QueryError } from "../errors";

export class SuccessorNotificationRepository {
  constructor(private db: Kysely<Database>) {}

  async create(data: NewSuccessorNotification): Promise<SuccessorNotification> {
    try {
      const notification = await this.db
        .insertInto("successor_notifications")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return notification;
    } catch (error) {
      throw new QueryError(
        `Failed to create successor notification: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(
    handoverProcessId: string,
    successorId: string,
    data: SuccessorNotificationUpdate,
  ): Promise<SuccessorNotification> {
    try {
      const notification = await this.db
        .updateTable("successor_notifications")
        .set(data)
        .where("handover_process_id", "=", handoverProcessId)
        .where("successor_id", "=", successorId)
        .returningAll()
        .executeTakeFirst();

      if (!notification) {
        throw new NotFoundError("Successor notification");
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update successor notification: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByHandoverProcess(
    handoverProcessId: string,
  ): Promise<SuccessorNotification[]> {
    try {
      const notifications = await this.db
        .selectFrom("successor_notifications")
        .selectAll()
        .where("handover_process_id", "=", handoverProcessId)
        .orderBy("created_at", "desc")
        .execute();

      return notifications;
    } catch (error) {
      throw new QueryError(
        `Failed to find successor notifications: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findPendingVerifications(): Promise<SuccessorNotification[]> {
    try {
      const notifications = await this.db
        .selectFrom("successor_notifications")
        .selectAll()
        .where("verification_status", "=", "PENDING")
        .where("response_deadline", ">", new Date())
        .orderBy("response_deadline", "asc")
        .execute();

      return notifications;
    } catch (error) {
      throw new QueryError(
        `Failed to find pending verifications: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
