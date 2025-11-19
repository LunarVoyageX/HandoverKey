export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CryptoError";
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

export class KeyDerivationError extends CryptoError {
  constructor(message: string) {
    super(message, "KEY_DERIVATION_ERROR");
    this.name = "KeyDerivationError";
    Object.setPrototypeOf(this, KeyDerivationError.prototype);
  }
}

export class EncryptionError extends CryptoError {
  constructor(message: string) {
    super(message, "ENCRYPTION_ERROR");
    this.name = "EncryptionError";
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

export class DecryptionError extends CryptoError {
  constructor(message: string) {
    super(message, "DECRYPTION_ERROR");
    this.name = "DecryptionError";
    Object.setPrototypeOf(this, DecryptionError.prototype);
  }
}

export class ValidationError extends CryptoError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
