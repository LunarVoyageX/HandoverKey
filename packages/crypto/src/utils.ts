import { DEFAULT_SALT_LENGTH, DEFAULT_IV_LENGTH } from "./types";
import { ValidationError } from "./errors";

/**
 * Generates a cryptographically secure random salt
 *
 * @param length - Length of the salt in bytes (default: 16)
 * @returns Uint8Array containing random bytes
 */
export function generateSalt(length: number = DEFAULT_SALT_LENGTH): Uint8Array {
  if (length < 16) {
    throw new ValidationError("Salt length must be at least 16 bytes");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates a cryptographically secure random IV
 *
 * @param length - Length of the IV in bytes (default: 12 for GCM)
 * @returns Uint8Array containing random bytes
 */
export function generateIV(length: number = DEFAULT_IV_LENGTH): Uint8Array {
  if (length < 12) {
    throw new ValidationError("IV length must be at least 12 bytes for GCM");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates cryptographically secure random bytes
 *
 * @param length - Number of bytes to generate
 * @returns Uint8Array containing random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new ValidationError("Length must be positive");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Computes SHA-256 hash of data
 *
 * @param data - Data to hash (string or Uint8Array)
 * @returns Promise resolving to hex-encoded hash string
 */
export async function hash(data: string | Uint8Array): Promise<string> {
  if (data === null || data === undefined) {
    throw new ValidationError("Data must be provided");
  }

  const dataBuffer =
    typeof data === "string" ? new TextEncoder().encode(data) : data;

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    dataBuffer as BufferSource,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Converts Uint8Array to base64 string
 *
 * @param data - Data to encode
 * @returns Base64-encoded string
 */
export function toBase64(data: Uint8Array): string {
  if (!(data instanceof Uint8Array)) {
    throw new ValidationError("Data must be a Uint8Array");
  }
  return Buffer.from(data).toString("base64");
}

/**
 * Converts base64 string to Uint8Array
 *
 * @param base64 - Base64-encoded string
 * @returns Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  if (typeof base64 !== "string") {
    throw new ValidationError("Input must be a string");
  }

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64)) {
    throw new ValidationError("Invalid base64 format");
  }

  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Securely compares two Uint8Arrays in constant time
 *
 * @param a - First array
 * @param b - Second array
 * @returns True if arrays are equal
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    throw new ValidationError("Both inputs must be Uint8Arrays");
  }

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}
