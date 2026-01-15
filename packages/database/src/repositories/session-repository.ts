import { Kysely } from "kysely";
import { Database, Session, NewSession, SessionUpdate } from "../types";
import { NotFoundError, QueryError } from "../errors";

export class SessionRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Session | null> {
    try {
      const session = await this.db
        .selectFrom("sessions")
        .selectAll()
        .where("id", "=", id)
        .where("expires_at", ">", new Date())
        .executeTakeFirst();

      return session ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find session: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    try {
      const session = await this.db
        .selectFrom("sessions")
        .selectAll()
        .where("token_hash", "=", tokenHash)
        .where("expires_at", ">", new Date())
        .executeTakeFirst();

      return session ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find session by token: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(userId: string): Promise<Session[]> {
    try {
      const sessions = await this.db
        .selectFrom("sessions")
        .selectAll()
        .where("user_id", "=", userId)
        .where("expires_at", ">", new Date())
        .orderBy("created_at", "desc")
        .execute();

      return sessions;
    } catch (error) {
      throw new QueryError(
        `Failed to find user sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewSession): Promise<Session> {
    try {
      const session = await this.db
        .insertInto("sessions")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return session;
    } catch (error) {
      throw new QueryError(
        `Failed to create session: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(id: string, data: SessionUpdate): Promise<Session> {
    try {
      const session = await this.db
        .updateTable("sessions")
        .set(data)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();

      if (!session) {
        throw new NotFoundError("Session");
      }

      return session;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update session: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async updateLastActivity(id: string): Promise<void> {
    try {
      await this.db
        .updateTable("sessions")
        .set({ last_activity: new Date() })
        .where("id", "=", id)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to update session activity: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.db
        .deleteFrom("sessions")
        .where("id", "=", id)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        throw new NotFoundError("Session");
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to delete session: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      await this.db
        .deleteFrom("sessions")
        .where("user_id", "=", userId)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to delete user sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.db
        .deleteFrom("sessions")
        .where("expires_at", "<", new Date())
        .executeTakeFirst();

      return Number(result.numDeletedRows);
    } catch (error) {
      throw new QueryError(
        `Failed to delete expired sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
