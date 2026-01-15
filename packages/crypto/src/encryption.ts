import {
  EncryptedData,
  EncryptionOptions,
  DEFAULT_ALGORITHM,
  DEFAULT_IV_LENGTH,
  DEFAULT_TAG_LENGTH,
} from "./types.js";
import { EncryptionError, DecryptionError, ValidationError } from "./errors.js";
import { generateIV } from "./utils.js";

/**
 * Encrypts data using AES-256-GCM
 *
 * @param data - The data to encrypt (string or Uint8Array)
 * @param key - The encryption key (must be AES-GCM key)
 * @param options - Optional encryption parameters
 * @returns Promise resolving to encrypted data with IV
 * @throws {ValidationError} If inputs are invalid
 * @throws {EncryptionError} If encryption fails
 */
export async function encrypt(
  data: string | Uint8Array,
  key: CryptoKey,
  options: EncryptionOptions = {},
): Promise<EncryptedData> {
  // Validate inputs
  if (data === null || data === undefined) {
    throw new ValidationError("Data must be provided");
  }

  if (typeof data === "string" && data.length === 0) {
    throw new ValidationError("Data string cannot be empty");
  }

  if (data instanceof Uint8Array && data.length === 0) {
    throw new ValidationError("Data array cannot be empty");
  }

  // Check if key is a CryptoKey (handle Jest/test environments where CryptoKey might not be defined)
  if (typeof CryptoKey !== "undefined" && !(key instanceof CryptoKey)) {
    throw new ValidationError("Key must be a CryptoKey");
  }

  // Additional validation for key object structure
  if (!key || typeof key !== "object" || !key.algorithm) {
    throw new ValidationError("Invalid key object");
  }

  if (key.algorithm.name !== "AES-GCM") {
    throw new ValidationError("Key must be an AES-GCM key");
  }

  const ivLength = options.ivLength || DEFAULT_IV_LENGTH;
  const tagLength = options.tagLength || DEFAULT_TAG_LENGTH;
  const algorithm = options.algorithm || DEFAULT_ALGORITHM;

  try {
    // Generate random IV
    const iv = generateIV(ivLength);

    // Convert string to Uint8Array if needed
    const dataBuffer =
      typeof data === "string" ? new TextEncoder().encode(data) : data;

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        tagLength: tagLength,
      },
      key,
      dataBuffer as BufferSource,
    );

    return {
      data: new Uint8Array(encryptedBuffer),
      iv: iv,
      algorithm: algorithm,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decrypts data using AES-256-GCM
 *
 * @param encryptedData - The encrypted data with IV
 * @param key - The decryption key (must be AES-GCM key)
 * @returns Promise resolving to decrypted string
 * @throws {ValidationError} If inputs are invalid
 * @throws {DecryptionError} If decryption fails (wrong key, tampered data, etc.)
 */
export async function decrypt(
  encryptedData: EncryptedData,
  key: CryptoKey,
): Promise<string> {
  // Validate inputs
  if (!encryptedData || typeof encryptedData !== "object") {
    throw new ValidationError("Encrypted data must be an object");
  }

  if (!(encryptedData.data instanceof Uint8Array)) {
    throw new ValidationError("Encrypted data must contain a Uint8Array");
  }

  if (!(encryptedData.iv instanceof Uint8Array)) {
    throw new ValidationError("IV must be a Uint8Array");
  }

  if (encryptedData.data.length === 0) {
    throw new ValidationError("Encrypted data cannot be empty");
  }

  if (encryptedData.iv.length === 0) {
    throw new ValidationError("IV cannot be empty");
  }

  // Check if key is a CryptoKey (handle Jest/test environments where CryptoKey might not be defined)
  if (typeof CryptoKey !== "undefined" && !(key instanceof CryptoKey)) {
    throw new ValidationError("Key must be a CryptoKey");
  }

  // Additional validation for key object structure
  if (!key || typeof key !== "object" || !key.algorithm) {
    throw new ValidationError("Invalid key object");
  }

  if (key.algorithm.name !== "AES-GCM") {
    throw new ValidationError("Key must be an AES-GCM key");
  }

  try {
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: encryptedData.iv as BufferSource,
        tagLength: DEFAULT_TAG_LENGTH,
      },
      key,
      encryptedData.data as BufferSource,
    );

    // Convert buffer to string
    const decryptedText = new TextDecoder().decode(decryptedBuffer);

    return decryptedText;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    // GCM authentication failure or wrong key
    throw new DecryptionError(
      "Decryption failed - invalid key or tampered data",
    );
  }
}

/**
 * Encrypts a file or binary data
 *
 * @param data - The file or binary data to encrypt
 * @param key - The encryption key
 * @returns Promise resolving to encrypted data
 */
export async function encryptFile(
  data: File | Uint8Array,
  key: CryptoKey,
): Promise<EncryptedData> {
  const fileData =
    data instanceof File ? new Uint8Array(await data.arrayBuffer()) : data;

  return encrypt(fileData, key);
}

/**
 * Decrypts file or binary data
 *
 * @param encryptedData - The encrypted data
 * @param key - The decryption key
 * @returns Promise resolving to decrypted binary data
 */
export async function decryptFile(
  encryptedData: EncryptedData,
  key: CryptoKey,
): Promise<Uint8Array> {
  // Validate inputs (similar to decrypt)
  if (!encryptedData || typeof encryptedData !== "object") {
    throw new ValidationError("Encrypted data must be an object");
  }

  if (!(encryptedData.data instanceof Uint8Array)) {
    throw new ValidationError("Encrypted data must contain a Uint8Array");
  }

  if (!(encryptedData.iv instanceof Uint8Array)) {
    throw new ValidationError("IV must be a Uint8Array");
  }

  if (!(key instanceof CryptoKey)) {
    throw new ValidationError("Key must be a CryptoKey");
  }

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: encryptedData.iv as BufferSource,
        tagLength: DEFAULT_TAG_LENGTH,
      },
      key,
      encryptedData.data as BufferSource,
    );

    return new Uint8Array(decryptedBuffer);
  } catch {
    throw new DecryptionError(
      "File decryption failed - invalid key or tampered data",
    );
  }
}

/**
 * Encrypts an object by JSON stringifying it first
 *
 * @param obj - The object to encrypt
 * @param key - The encryption key
 * @returns Promise resolving to encrypted data
 */
export async function encryptObject<T>(
  obj: T,
  key: CryptoKey,
): Promise<EncryptedData> {
  if (obj === null || obj === undefined) {
    throw new ValidationError("Object must be provided");
  }

  try {
    const jsonString = JSON.stringify(obj);
    return encrypt(jsonString, key);
  } catch (error) {
    throw new EncryptionError(
      `Object encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decrypts and parses an encrypted object
 *
 * @param encryptedData - The encrypted data
 * @param key - The decryption key
 * @returns Promise resolving to the decrypted object
 */
export async function decryptObject<T>(
  encryptedData: EncryptedData,
  key: CryptoKey,
): Promise<T> {
  try {
    const jsonString = await decrypt(encryptedData, key);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (error instanceof DecryptionError || error instanceof ValidationError) {
      throw error;
    }
    throw new DecryptionError(
      `Object decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
