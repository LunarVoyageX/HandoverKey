import { deriveKey } from "./key-derivation";
import { KeyDerivationError, ValidationError } from "./errors";
import { generateSalt } from "./utils";

describe("deriveKey", () => {
  it("should derive a key from password and salt", async () => {
    const password = "test-password-123";
    const salt = generateSalt();

    const key = await deriveKey(password, salt);

    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("should derive the same key for the same password and salt", async () => {
    const password = "test-password-123";
    const salt = generateSalt();

    const key1 = await deriveKey(password, salt);
    const key2 = await deriveKey(password, salt);

    // Export keys to compare
    const key1Bits = await crypto.subtle.exportKey("raw", key1);
    const key2Bits = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(key1Bits)).toEqual(new Uint8Array(key2Bits));
  });

  it("should derive different keys for different passwords", async () => {
    const salt = generateSalt();

    const key1 = await deriveKey("password1", salt);
    const key2 = await deriveKey("password2", salt);

    const key1Bits = await crypto.subtle.exportKey("raw", key1);
    const key2Bits = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(key1Bits)).not.toEqual(new Uint8Array(key2Bits));
  });

  it("should derive different keys for different salts", async () => {
    const password = "test-password-123";

    const key1 = await deriveKey(password, generateSalt());
    const key2 = await deriveKey(password, generateSalt());

    const key1Bits = await crypto.subtle.exportKey("raw", key1);
    const key2Bits = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(key1Bits)).not.toEqual(new Uint8Array(key2Bits));
  });

  it("should throw ValidationError for empty password", async () => {
    const salt = generateSalt();

    await expect(deriveKey("", salt)).rejects.toThrow(ValidationError);
  });

  it("should throw ValidationError for short password", async () => {
    const salt = generateSalt();

    await expect(deriveKey("short", salt)).rejects.toThrow(ValidationError);
    await expect(deriveKey("short", salt)).rejects.toThrow(
      "Password must be at least 8 characters long",
    );
  });

  it("should throw ValidationError for invalid salt", async () => {
    await expect(deriveKey("password123", new Uint8Array())).rejects.toThrow(
      ValidationError,
    );
  });

  it("should throw ValidationError for short salt", async () => {
    const shortSalt = new Uint8Array(8);

    await expect(deriveKey("password123", shortSalt)).rejects.toThrow(
      ValidationError,
    );
    await expect(deriveKey("password123", shortSalt)).rejects.toThrow(
      "Salt must be at least 16 bytes",
    );
  });

  it("should accept custom iterations", async () => {
    const password = "test-password-123";
    const salt = generateSalt();

    const key = await deriveKey(password, salt, { iterations: 150000 });

    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should throw ValidationError for low iterations", async () => {
    const password = "test-password-123";
    const salt = generateSalt();

    await expect(
      deriveKey(password, salt, { iterations: 50000 }),
    ).rejects.toThrow(ValidationError);
  });
});
