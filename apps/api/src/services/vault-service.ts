import {
  getDatabaseClient,
  VaultRepository,
  VaultFilters as DbVaultFilters,
} from "@handoverkey/database";
import { EncryptedData } from "@handoverkey/shared";
import { v4 as uuidv4 } from "uuid";

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

export class VaultService {
  private static getVaultRepository(): VaultRepository {
    const dbClient = getDatabaseClient();
    return new VaultRepository(dbClient.getKysely());
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
    } catch {
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
