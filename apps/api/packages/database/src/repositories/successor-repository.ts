import { Kysely } from "kysely";
import { Database, Successor, NewSuccessor, SuccessorUpdate } from "../types";
import { NotFoundError, QueryError } from "../errors";

export class SuccessorRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Successor | null> {
    try {
      const successor = await this.db
        .selectFrom("successors")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return successor ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find successor: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(userId: string): Promise<Successor[]> {
    try {
      const successors = await this.db
        .selectFrom("successors")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .execute();

      return successors;
    } catch (error) {
      throw new QueryError(
        `Failed to find successors: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewSuccessor): Promise<Successor> {
    try {
      const successor = await this.db
        .insertInto("successors")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return successor;
    } catch (error) {
      throw new QueryError(
        `Failed to create successor: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(id: string, data: SuccessorUpdate): Promise<Successor> {
    try {
      const successor = await this.db
        .updateTable("successors")
        .set(data)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();

      if (!successor) {
        throw new NotFoundError("Successor");
      }

      return successor;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update successor: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.db
        .deleteFrom("successors")
        .where("id", "=", id)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        throw new NotFoundError("Successor");
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to delete successor: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
