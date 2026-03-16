import {
  CryptoError,
  KeyDerivationError,
  EncryptionError,
  DecryptionError,
  ValidationError,
} from "./errors.js";

describe("CryptoError hierarchy", () => {
  it("CryptoError has name, message, and code", () => {
    const err = new CryptoError("test", "TEST_CODE");
    expect(err.name).toBe("CryptoError");
    expect(err.message).toBe("test");
    expect(err.code).toBe("TEST_CODE");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CryptoError);
  });

  it("KeyDerivationError sets correct code", () => {
    const err = new KeyDerivationError("bad key");
    expect(err.name).toBe("KeyDerivationError");
    expect(err.code).toBe("KEY_DERIVATION_ERROR");
    expect(err).toBeInstanceOf(CryptoError);
  });

  it("EncryptionError sets correct code", () => {
    const err = new EncryptionError("encrypt failed");
    expect(err.name).toBe("EncryptionError");
    expect(err.code).toBe("ENCRYPTION_ERROR");
    expect(err).toBeInstanceOf(CryptoError);
  });

  it("DecryptionError sets correct code", () => {
    const err = new DecryptionError("decrypt failed");
    expect(err.name).toBe("DecryptionError");
    expect(err.code).toBe("DECRYPTION_ERROR");
    expect(err).toBeInstanceOf(CryptoError);
  });

  it("ValidationError sets correct code", () => {
    const err = new ValidationError("invalid input");
    expect(err.name).toBe("ValidationError");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err).toBeInstanceOf(CryptoError);
  });
});
