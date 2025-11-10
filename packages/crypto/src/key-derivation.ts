import {
  KeyDerivationOptions,
  DEFAULT_ITERATIONS,
  DEFAULT_HASH,
} from './types';
import { KeyDerivationError, ValidationError } from './errors';

/**
 * Derives a cryptographic key from a password using PBKDF2
 *
 * @param password - The password to derive the key from
 * @param salt - Cryptographically secure random salt
 * @param options - Optional key derivation parameters
 * @returns Promise resolving to a CryptoKey suitable for AES-GCM encryption
 * @throws {ValidationError} If password or salt is invalid
 * @throws {KeyDerivationError} If key derivation fails
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  options: KeyDerivationOptions = {}
): Promise<CryptoKey> {
  // Validate inputs
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password must be a non-empty string');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  if (!(salt instanceof Uint8Array) || salt.length === 0) {
    throw new ValidationError('Salt must be a non-empty Uint8Array');
  }

  if (salt.length < 16) {
    throw new ValidationError('Salt must be at least 16 bytes');
  }

  const iterations = options.iterations || DEFAULT_ITERATIONS;
  const hash = options.hash || DEFAULT_HASH;

  if (iterations < 100000) {
    throw new ValidationError('Iterations must be at least 100,000');
  }

  try {
    // Import password as base key
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive key bits using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: iterations,
        hash: hash,
      },
      baseKey,
      256 // 256 bits for AES-256
    );

    // Import derived bits as AES-GCM key
    // Make extractable in test environment for verification
    const extractable = process.env.NODE_ENV === 'test';
    const key = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-GCM' },
      extractable,
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new KeyDerivationError(
      `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
