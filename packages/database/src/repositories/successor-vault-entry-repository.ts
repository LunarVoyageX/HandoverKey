import { Kysely } from "kysely";
import {
  Database,
  SuccessorVaultEntry,
  NewSuccessorVaultEntry,
} from "../types";
import { QueryError } from "../errors";

export class SuccessorVaultEntryRepository {
  constructor(private db: Kysely<Database>) {}

  async findBySuccessorId(successorId: string): Promise<SuccessorVaultEntry[]> {
    try {
      return await this.db
        .selectFrom("successor_vault_entries")
        .selectAll()
        .where("successor_id", "=", successorId)
        .orderBy("created_at", "asc")
        .execute();
    } catch (error) {
      throw new QueryError(
        `Failed to read successor assignments: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async replaceBySuccessorId(
    successorId: string,
    vaultEntryIds: string[],
  ): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom("successor_vault_entries")
          .where("successor_id", "=", successorId)
          .execute();

        if (vaultEntryIds.length === 0) {
          return;
        }

        const values: NewSuccessorVaultEntry[] = vaultEntryIds.map(
          (vaultEntryId) => ({
            successor_id: successorId,
            vault_entry_id: vaultEntryId,
          }),
        );

        await trx
          .insertInto("successor_vault_entries")
          .values(values)
          .execute();
      });
    } catch (error) {
      throw new QueryError(
        `Failed to update successor assignments: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
