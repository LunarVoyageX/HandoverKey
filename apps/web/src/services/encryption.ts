// This service handles client-side encryption/decryption
// In a real app, the key would be derived from the user's password and not stored in localStorage

// Mock implementation using Web Crypto API directly to avoid dependency issues for now
// We will try to match the interface expected by the backend

export interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  salt: string;
  algorithm: string;
}

const ALGORITHM = "AES-GCM";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100000;
const AUTH_KEY_ITERATIONS = 10000; // Lower iterations for auth key (server will hash it again)

let cachedKey: CryptoKey | null = null;

/**
 * Derives the Authentication Key from the password and email.
 * This key is sent to the server for login/registration.
 * The server NEVER sees the raw password.
 */
export async function deriveAuthKey(
  password: string,
  email: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(email.toLowerCase().trim()); // Use email as salt for Auth Key

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: AUTH_KEY_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );

  // Convert to hex string
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a random salt for encryption key derivation.
 * This is generated on registration and stored on the server.
 */
export function generateEncryptionSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return arrayBufferToBase64(salt.buffer);
}

export async function setMasterKey(
  password: string,
  saltBase64: string,
): Promise<void> {
  try {
    const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
    cachedKey = await deriveKey(password, salt);
  } catch (error) {
    console.error("Failed to derive master key", error);
    throw error;
  }
}

export function clearMasterKey() {
  cachedKey = null;
}

export function isMasterKeySet(): boolean {
  return cachedKey !== null;
}

export async function getMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  throw new Error(
    "Master key not set. Please login again to unlock your vault.",
  );
}

export async function exportRawMasterKey(): Promise<Uint8Array> {
  const key = await getMasterKey();
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );

  return window.crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: ALGORITHM },
    true, // extractable must be true to support Shamir's Secret Sharing export
    ["encrypt", "decrypt"],
  );
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 32768; // 32KB to avoid stack overflow

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export async function encryptData(data: unknown): Promise<EncryptedPayload> {
  const key = await getMasterKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH)); // Not used for AES-GCM direct, but backend expects it

  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encodedData,
  );

  return {
    encryptedData: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    algorithm: ALGORITHM,
  };
}

export async function decryptData(payload: {
  encryptedData: string;
  iv: string;
}): Promise<unknown> {
  const key = await getMasterKey();
  return decryptDataWithKey(payload, key);
}

export async function decryptDataWithKey(
  payload: {
    encryptedData: string;
    iv: string;
  },
  key: CryptoKey,
): Promise<unknown> {
  try {
    const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
    const data = Uint8Array.from(atob(payload.encryptedData), (c) =>
      c.charCodeAt(0),
    );

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data,
    );

    const decoded = new TextDecoder().decode(decryptedContent);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

export async function importRawMasterKey(
  rawKey: Uint8Array,
): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}
