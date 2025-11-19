import {
  deriveKey,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  generateSalt,
  toBase64,
  fromBase64,
  type EncryptedData,
} from "@handoverkey/crypto";

/**
 * Client-side encryption service using Web Crypto API
 */

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export interface DecryptionParams {
  encryptedData: string;
  iv: string;
  salt: string;
  password: string;
}

/**
 * Encrypts data using AES-256-GCM with PBKDF2 key derivation
 */
export async function encryptData(
  data: string,
  password: string,
): Promise<EncryptionResult> {
  // Generate salt
  const salt = generateSalt();

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt data
  const encrypted = await encrypt(data, key);

  return {
    encryptedData: toBase64(encrypted.data),
    iv: toBase64(encrypted.iv),
    salt: toBase64(salt),
    algorithm: encrypted.algorithm,
  };
}

/**
 * Decrypts data using AES-256-GCM with PBKDF2 key derivation
 */
export async function decryptData(params: DecryptionParams): Promise<string> {
  const { encryptedData, iv, salt, password } = params;

  // Parse base64 strings
  const saltBytes = fromBase64(salt);
  const ivBytes = fromBase64(iv);
  const dataBytes = fromBase64(encryptedData);

  // Derive key from password
  const key = await deriveKey(password, saltBytes);

  // Decrypt data
  const encrypted: EncryptedData = {
    data: dataBytes,
    iv: ivBytes,
    algorithm: "AES-256-GCM",
  };

  return await decrypt(encrypted, key);
}

/**
 * Encrypts an object
 */
export async function encryptVaultData<T>(
  data: T,
  password: string,
): Promise<EncryptionResult> {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const encrypted = await encryptObject(data, key);

  return {
    encryptedData: toBase64(encrypted.data),
    iv: toBase64(encrypted.iv),
    salt: toBase64(salt),
    algorithm: encrypted.algorithm,
  };
}

/**
 * Decrypts an object
 */
export async function decryptVaultData<T>(
  params: DecryptionParams,
): Promise<T> {
  const { encryptedData, iv, salt, password } = params;

  const saltBytes = fromBase64(salt);
  const ivBytes = fromBase64(iv);
  const dataBytes = fromBase64(encryptedData);

  const key = await deriveKey(password, saltBytes);

  const encrypted: EncryptedData = {
    data: dataBytes,
    iv: ivBytes,
    algorithm: "AES-256-GCM",
  };

  return await decryptObject<T>(encrypted, key);
}
