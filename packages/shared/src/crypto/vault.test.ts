import { jest } from "@jest/globals";
import type { VaultEntry } from "../types/crypto.js";
import { VaultManager } from "./vault.js";

jest.mock("uuid", () => {
  let counter = 1;
  return {
    v4: jest.fn(
      () => `00000000-0000-4000-8000-${String(counter++).padStart(12, "0")}`,
    ),
  };
});

jest.mock("@handoverkey/crypto", () => ({
  encrypt: jest.fn(
    async (payload: string | Uint8Array): Promise<Record<string, unknown>> => {
      const bytes =
        typeof payload === "string"
          ? new TextEncoder().encode(payload)
          : payload;

      return {
        data: bytes,
        iv: new Uint8Array([1, 2, 3]),
        salt: new Uint8Array([4, 5, 6]),
        algorithm: "AES-GCM",
      };
    },
  ),
  decrypt: jest.fn(
    async (encrypted: {
      data: Uint8Array;
      algorithm: string;
    }): Promise<string> => {
      if (encrypted.algorithm === "BROKEN") {
        throw new Error("Cannot decrypt payload");
      }
      return new TextDecoder().decode(encrypted.data);
    },
  ),
  decryptFile: jest.fn(
    async (encrypted: { data: Uint8Array }): Promise<Uint8Array> =>
      encrypted.data,
  ),
}));

describe("VaultManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates and decrypts text entries", async () => {
    const key = {} as CryptoKey;
    const entry = await VaultManager.createEntry(
      "user-1",
      "super-secret-note",
      key,
      "notes",
      ["personal"],
    );

    expect(entry.userId).toBe("user-1");
    expect(entry.version).toBe(1);
    expect(VaultManager.validateEntry(entry)).toBe(true);

    const decrypted = await VaultManager.decryptEntry(entry, key);
    expect(decrypted).toBe("super-secret-note");
  });

  it("updates entries with incremented version and metadata", async () => {
    const key = {} as CryptoKey;
    const entry = await VaultManager.createEntry("user-2", "old", key);
    const updated = await VaultManager.updateEntry(
      entry,
      "new-value",
      key,
      "credentials",
      ["updated"],
    );

    expect(updated.version).toBe(entry.version + 1);
    expect(updated.category).toBe("credentials");
    expect(updated.tags).toEqual(["updated"]);

    const decrypted = await VaultManager.decryptEntry(updated, key);
    expect(decrypted).toBe("new-value");
  });

  it("decrypts binary file entries", async () => {
    const key = {} as CryptoKey;
    const fileBytes = new Uint8Array([1, 4, 9, 16, 25]);
    const entry = await VaultManager.createEntry("user-3", fileBytes, key);

    const decryptedFile = await VaultManager.decryptFileEntry(entry, key);
    expect(Array.from(decryptedFile)).toEqual([1, 4, 9, 16, 25]);
  });

  it("searches by content, category, and tags while skipping undecryptable entries", async () => {
    const key = {} as CryptoKey;

    const loginEntry = await VaultManager.createEntry(
      "user-4",
      "bank account password",
      key,
      "Banking",
      ["finance", "important"],
    );
    const travelEntry = await VaultManager.createEntry(
      "user-4",
      "trip checklist and tickets",
      key,
      "Travel",
      ["personal"],
    );
    const undecryptableEntry = {
      ...travelEntry,
      category: "Misc",
      encryptedData: {
        ...travelEntry.encryptedData,
        algorithm: "BROKEN",
      },
    };

    const byContent = await VaultManager.searchEntries(
      [loginEntry, travelEntry, undecryptableEntry],
      "password",
      key,
    );
    expect(byContent.map((entry) => entry.id)).toContain(loginEntry.id);

    const byCategory = await VaultManager.searchEntries(
      [loginEntry, travelEntry, undecryptableEntry],
      "misc",
      key,
    );
    expect(byCategory).toHaveLength(0);

    const byTag = await VaultManager.searchEntries(
      [loginEntry, travelEntry, undecryptableEntry],
      "finance",
      key,
    );
    expect(byTag.map((entry) => entry.id)).toContain(loginEntry.id);
    expect(byTag.map((entry) => entry.id)).not.toContain(undecryptableEntry.id);
  });

  it("returns grouped categories and tags in sorted order", async () => {
    const key = {} as CryptoKey;
    const first = await VaultManager.createEntry(
      "user-5",
      "first",
      key,
      "Work",
      ["project", "secure"],
    );
    const second = await VaultManager.createEntry(
      "user-5",
      "second",
      key,
      "Personal",
      ["finance", "secure"],
    );
    const entries = [first, second];

    expect(VaultManager.getEntriesByCategory(entries, "Work")).toHaveLength(1);
    expect(VaultManager.getEntriesByTag(entries, "secure")).toHaveLength(2);
    expect(VaultManager.getCategories(entries)).toEqual(["Personal", "Work"]);
    expect(VaultManager.getTags(entries)).toEqual([
      "finance",
      "project",
      "secure",
    ]);
  });

  it("rejects invalid vault entry shapes", async () => {
    const key = {} as CryptoKey;
    const validEntry = await VaultManager.createEntry("user-6", "payload", key);
    const invalidEntry = {
      ...validEntry,
      version: 0,
    } as VaultEntry;

    expect(VaultManager.validateEntry(validEntry)).toBe(true);
    expect(VaultManager.validateEntry(invalidEntry)).toBe(false);
  });
});
