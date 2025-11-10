export interface EncryptedData {
  data: Uint8Array;
  iv: Uint8Array;
  algorithm: string;
}

export interface KeyDerivationOptions {
  iterations?: number;
  hash?: string;
}

export interface EncryptionOptions {
  algorithm?: string;
  ivLength?: number;
  tagLength?: number;
}

export const DEFAULT_ITERATIONS = 100000;
export const DEFAULT_HASH = 'SHA-256';
export const DEFAULT_ALGORITHM = 'AES-256-GCM';
export const DEFAULT_IV_LENGTH = 12;
export const DEFAULT_TAG_LENGTH = 128;
export const DEFAULT_SALT_LENGTH = 16;
