import { Kysely } from "kysely";
import { Database, User, NewUser, UserUpdate } from "../types";
import { NotFoundError, QueryError } from "../errors";

export class UserRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return user ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find user by id: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.db
        .selectFrom("users")
        .selectAll()
        .where("email", "=", email)
        .executeTakeFirst();

      return user ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find user by email: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewUser): Promise<User> {
    try {
      const user = await this.db
        .insertInto("users")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return user;
    } catch (error) {
      throw new QueryError(
        `Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(id: string, data: UserUpdate): Promise<User> {
    try {
      const user = await this.db
        .updateTable("users")
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();

      if (!user) {
        throw new NotFoundError("User");
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update user: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Hard delete
      const result = await this.db
        .deleteFrom("users")
        .where("id", "=", id)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        throw new NotFoundError("User");
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to delete user: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.db
        .updateTable("users")
        .set({
          last_login: new Date(),
          failed_login_attempts: 0,
          locked_until: null,
        })
        .where("id", "=", id)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to update last login: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    try {
      await this.db
        .updateTable("users")
        .set((eb) => ({
          failed_login_attempts: eb("failed_login_attempts", "+", 1),
        }))
        .where("id", "=", id)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to increment failed attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async lockAccount(id: string, until: Date): Promise<void> {
    try {
      await this.db
        .updateTable("users")
        .set({ locked_until: until })
        .where("id", "=", id)
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to lock account: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findInactiveUsers(thresholdDays: number): Promise<User[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

      const users = await this.db
        .selectFrom("users")
        .selectAll()
        .where("last_login", "<", cutoffDate)
        .execute();

      return users;
    } catch (error) {
      throw new QueryError(
        `Failed to find inactive users: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
