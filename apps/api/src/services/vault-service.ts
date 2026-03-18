import {
  getDatabaseClient,
  VaultRepository,
  VaultFilters as DbVaultFilters,
  SuccessorRepository,
  SuccessorVaultEntryRepository,
  NewVaultEntry,
} from "@handoverkey/database";
import { EncryptedData } from "@handoverkey/shared";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../config/logger";

export interface VaultFilters {
  category?: string;
  tag?: string;
  search?: string;
}

export interface VaultEntryResponse {
  id: string;
  userId: string;
  encryptedData: string;
  iv: string;
  salt?: string;
  algorithm: string;
  category?: string;
  tags?: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultExportEntry {
  id: string;
  encryptedData: string;
  iv: string;
  salt?: string;
  algorithm: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultExportPayload {
  version: "1.0";
  exportedAt: string;
  entryCount: number;
  entries: VaultExportEntry[];
}

export class VaultService {
  private static getVaultRepository(): VaultRepository {
    const dbClient = getDatabaseClient();
    return new VaultRepository(dbClient.getKysely());
  }

  private static getSuccessorRepository(): SuccessorRepository {
    const dbClient = getDatabaseClient();
    return new SuccessorRepository(dbClient.getKysely());
  }

  private static getSuccessorVaultEntryRepository(): SuccessorVaultEntryRepository {
    const dbClient = getDatabaseClient();
    return new SuccessorVaultEntryRepository(dbClient.getKysely());
  }

  static async createEntry(
    userId: string,
    encryptedData: EncryptedData,
    salt: Buffer,
    category?: string,
    tags?: string[],
  ): Promise<VaultEntryResponse> {
    const id = uuidv4();
    const vaultRepo = this.getVaultRepository();

    // Convert encrypted data to Buffer
    const encryptedBuffer = Buffer.from(encryptedData.data);
    const ivBuffer = Buffer.from(encryptedData.iv);

    const dbEntry = await vaultRepo.create({
      id,
      user_id: userId,
      encrypted_data: encryptedBuffer,
      iv: ivBuffer,
      salt: salt,
      algorithm: encryptedData.algorithm,
      category: category ?? null,
      tags: tags ?? null,
    });

    return this.mapDbEntryToVaultEntry(dbEntry);
  }

  static async getUserEntries(
    userId: string,
    filters: VaultFilters = {},
  ): Promise<VaultEntryResponse[]> {
    const vaultRepo = this.getVaultRepository();

    const dbFilters: DbVaultFilters = {
      category: filters.category,
      tag: filters.tag,
    };

    const dbEntries = await vaultRepo.findByUserId(userId, dbFilters);
    return dbEntries.map(this.mapDbEntryToVaultEntry);
  }

  static async getEntry(
    userId: string,
    entryId: string,
  ): Promise<VaultEntryResponse | null> {
    const vaultRepo = this.getVaultRepository();
    const dbEntry = await vaultRepo.findById(entryId, userId);

    if (!dbEntry) {
      return null;
    }

    return this.mapDbEntryToVaultEntry(dbEntry);
  }

  static async updateEntry(
    userId: string,
    entryId: string,
    encryptedData: EncryptedData,
    category?: string,
    tags?: string[],
  ): Promise<VaultEntryResponse | null> {
    const vaultRepo = this.getVaultRepository();

    // Convert encrypted data to Buffer
    const encryptedBuffer = Buffer.from(encryptedData.data);
    const ivBuffer = Buffer.from(encryptedData.iv);

    const dbEntry = await vaultRepo.update(entryId, userId, {
      encrypted_data: encryptedBuffer,
      iv: ivBuffer,
      algorithm: encryptedData.algorithm,
      category: category ?? null,
      tags: tags ?? null,
    });

    return this.mapDbEntryToVaultEntry(dbEntry);
  }

  static async deleteEntry(userId: string, entryId: string): Promise<boolean> {
    const vaultRepo = this.getVaultRepository();

    try {
      await vaultRepo.delete(entryId, userId);
      return true;
    } catch (error) {
      logger.error({ err: error, entryId }, "Failed to delete vault entry");
      return false;
    }
  }

  static async getEntriesByCategory(
    userId: string,
    category: string,
  ): Promise<VaultEntryResponse[]> {
    const vaultRepo = this.getVaultRepository();
    const dbEntries = await vaultRepo.findByUserId(userId, { category });
    return dbEntries.map(this.mapDbEntryToVaultEntry);
  }

  static async getEntriesByTag(
    userId: string,
    tag: string,
  ): Promise<VaultEntryResponse[]> {
    const vaultRepo = this.getVaultRepository();
    const dbEntries = await vaultRepo.findByUserId(userId, { tag });
    return dbEntries.map(this.mapDbEntryToVaultEntry);
  }

  static async getUserCategories(userId: string): Promise<string[]> {
    const vaultRepo = this.getVaultRepository();
    return await vaultRepo.getCategories(userId);
  }

  static async getUserTags(userId: string): Promise<string[]> {
    const vaultRepo = this.getVaultRepository();
    return await vaultRepo.getTags(userId);
  }

  static async getEntryCount(userId: string): Promise<number> {
    const vaultRepo = this.getVaultRepository();
    return await vaultRepo.getCount(userId);
  }

  static async getSuccessorEntries(
    userId: string,
    successorId?: string,
  ): Promise<VaultEntryResponse[]> {
    const vaultRepo = this.getVaultRepository();

    if (!successorId) {
      const dbEntries = await vaultRepo.findByUserId(userId, {});
      return dbEntries.map(this.mapDbEntryToVaultEntry);
    }

    const successorRepo = this.getSuccessorRepository();
    const successor = await successorRepo.findById(successorId);
    if (!successor || successor.user_id !== userId) {
      return [];
    }

    if (!successor.restrict_to_assigned_entries) {
      const dbEntries = await vaultRepo.findByUserId(userId, {});
      return dbEntries.map(this.mapDbEntryToVaultEntry);
    }

    const assignmentRepo = this.getSuccessorVaultEntryRepository();
    const assignments = await assignmentRepo.findBySuccessorId(successorId);
    const entryIds = assignments.map((a) => a.vault_entry_id);

    if (entryIds.length === 0) {
      return [];
    }

    const dbEntries = await vaultRepo.findByIds(userId, entryIds);
    return dbEntries.map(this.mapDbEntryToVaultEntry);
  }

  static async exportUserVault(userId: string): Promise<VaultExportPayload> {
    const entries = await this.getUserEntries(userId);
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      entryCount: entries.length,
      entries: entries.map((entry) => ({
        id: entry.id,
        encryptedData: entry.encryptedData,
        iv: entry.iv,
        salt: entry.salt,
        algorithm: entry.algorithm,
        category: entry.category,
        tags: entry.tags,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
    };
  }

  static async importUserVault(
    userId: string,
    payload: {
      mode: "merge" | "replace";
      entries: Array<{
        id?: string;
        encryptedData: string;
        iv: string;
        salt?: string;
        algorithm: "AES-GCM" | "AES-256-GCM";
        category?: string;
        tags?: string[];
      }>;
    },
  ): Promise<{ created: number; updated: number; total: number }> {
    const dbClient = getDatabaseClient();

    return dbClient.transaction(async (trx) => {
      const vaultRepo = new VaultRepository(trx);

      if (payload.mode === "replace") {
        await vaultRepo.deleteByUserId(userId);
      }

      const entriesById = new Map<
        string,
        Omit<NewVaultEntry, "id" | "user_id">
      >();
      for (const entry of payload.entries) {
        const targetId = entry.id || uuidv4();
        entriesById.set(targetId, {
          encrypted_data: Buffer.from(entry.encryptedData, "base64"),
          iv: Buffer.from(entry.iv, "base64"),
          salt: entry.salt ? Buffer.from(entry.salt, "base64") : null,
          algorithm: entry.algorithm,
          category: entry.category ?? null,
          tags: entry.tags ?? null,
        });
      }

      const preparedEntries = Array.from(entriesById.entries()).map(
        ([id, data]) => ({
          id,
          ...data,
        }),
      );

      const existingEntries = await vaultRepo.findByIds(
        userId,
        preparedEntries.map((entry) => entry.id),
      );
      const existingIds = new Set(existingEntries.map((entry) => entry.id));

      const createValues: NewVaultEntry[] = [];
      let updated = 0;

      for (const entry of preparedEntries) {
        if (existingIds.has(entry.id)) {
          await vaultRepo.update(entry.id, userId, {
            encrypted_data: entry.encrypted_data,
            iv: entry.iv,
            salt: entry.salt,
            algorithm: entry.algorithm,
            category: entry.category,
            tags: entry.tags,
          });
          updated += 1;
        } else {
          createValues.push({
            id: entry.id,
            user_id: userId,
            encrypted_data: entry.encrypted_data,
            iv: entry.iv,
            salt: entry.salt,
            algorithm: entry.algorithm,
            category: entry.category,
            tags: entry.tags,
          });
        }
      }

      if (createValues.length > 0) {
        await trx.insertInto("vault_entries").values(createValues).execute();
      }

      return {
        created: createValues.length,
        updated,
        total: preparedEntries.length,
      };
    });
  }

  private static mapDbEntryToVaultEntry(dbEntry: {
    id: string;
    user_id: string;
    encrypted_data: Buffer;
    iv: Buffer;
    salt?: Buffer | null;
    algorithm: string;
    category?: string | null;
    tags?: string[] | null;
    version: number;
    created_at: Date;
    updated_at: Date;
  }): VaultEntryResponse {
    return {
      id: dbEntry.id,
      userId: dbEntry.user_id,
      encryptedData: dbEntry.encrypted_data.toString("base64"),
      iv: dbEntry.iv.toString("base64"),
      salt: dbEntry.salt?.toString("base64"),
      algorithm: dbEntry.algorithm,
      category: dbEntry.category ?? undefined,
      tags: dbEntry.tags ?? undefined,
      version: dbEntry.version,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at,
    };
  }
}
