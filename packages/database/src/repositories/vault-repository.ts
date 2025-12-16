import { Kysely } from "kysely";
import {
  Database,
  VaultEntry,
  NewVaultEntry,
  VaultEntryUpdate,
} from "../types";
import { NotFoundError, QueryError } from "../errors";

export interface VaultFilters {
  category?: string;
  tag?: string;
}

export class VaultRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string, userId: string): Promise<VaultEntry | null> {
    try {
      const entry = await this.db
        .selectFrom("vault_entries")
        .selectAll()
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      return entry ?? null;
    } catch (error) {
      throw new QueryError(
        `Failed to find vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async findByUserId(
    userId: string,
    filters: VaultFilters = {},
  ): Promise<VaultEntry[]> {
    try {
      let query = this.db
        .selectFrom("vault_entries")
        .selectAll()
        .where("user_id", "=", userId);

      if (filters.category) {
        query = query.where("category", "=", filters.category);
      }

      if (filters.tag) {
        query = query.where((eb) =>
          eb(eb.val(filters.tag), "=", eb.fn.any("tags")),
        );
      }

      const entries = await query.orderBy("created_at", "desc").execute();

      return entries;
    } catch (error) {
      throw new QueryError(
        `Failed to find vault entries: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async create(data: NewVaultEntry): Promise<VaultEntry> {
    try {
      const entry = await this.db
        .insertInto("vault_entries")
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();

      return entry;
    } catch (error) {
      throw new QueryError(
        `Failed to create vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async update(
    id: string,
    userId: string,
    data: VaultEntryUpdate,
  ): Promise<VaultEntry> {
    try {
      const entry = await this.db
        .updateTable("vault_entries")
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .returningAll()
        .executeTakeFirst();

      if (!entry) {
        throw new NotFoundError("Vault entry");
      }

      return entry;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to update vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      // Hard delete
      const result = await this.db
        .deleteFrom("vault_entries")
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        throw new NotFoundError("Vault entry");
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new QueryError(
        `Failed to delete vault entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getCategories(userId: string): Promise<string[]> {
    try {
      const result = await this.db
        .selectFrom("vault_entries")
        .select("category")
        .distinct()
        .where("user_id", "=", userId)
        .where("category", "is not", null)
        .orderBy("category")
        .execute();

      return result
        .map((r) => r.category)
        .filter((c): c is string => c !== null);
    } catch (error) {
      throw new QueryError(
        `Failed to get categories: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getTags(userId: string): Promise<string[]> {
    try {
      const result = await this.db
        .selectFrom("vault_entries")
        .select("tags")
        .where("user_id", "=", userId)
        .where("tags", "is not", null)
        .execute();

      const allTags = new Set<string>();
      result.forEach((r) => {
        if (r.tags) {
          r.tags.forEach((tag) => allTags.add(tag));
        }
      });

      return Array.from(allTags).sort();
    } catch (error) {
      throw new QueryError(
        `Failed to get tags: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getCount(userId: string): Promise<number> {
    try {
      const result = await this.db
        .selectFrom("vault_entries")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("user_id", "=", userId)
        .executeTakeFirstOrThrow();

      return Number(result.count);
    } catch (error) {
      throw new QueryError(
        `Failed to get vault entry count: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
