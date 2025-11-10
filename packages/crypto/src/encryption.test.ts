import { encrypt, decrypt, encryptFile, decryptFile, encryptObject, decryptObject } from './encryption';
import { deriveKey } from './key-derivation';
import { generateSalt } from './utils';
import { EncryptionError, DecryptionError, ValidationError } from './errors';

describe('encrypt and decrypt', () => {
  let key: CryptoKey;

  beforeEach(async () => {
    const password = 'test-password-123';
    const salt = generateSalt();
    key = await deriveKey(password, salt);
  });

  it('should encrypt and decrypt a string', async () => {
    const plaintext = 'Hello, World!';

    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt and decrypt empty string', async () => {
    const plaintext = '';

    await expect(encrypt(plaintext, key)).rejects.toThrow(ValidationError);
  });

  it('should encrypt and decrypt binary data', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);

    const encrypted = await encrypt(data, key);
    const decryptedStr = await decrypt(encrypted, key);

    // Convert back to Uint8Array
    const decrypted = new TextEncoder().encode(decryptedStr);
    expect(decrypted).toEqual(data);
  });

  it('should produce different ciphertext for same plaintext', async () => {
    const plaintext = 'Hello, World!';

    const encrypted1 = await encrypt(plaintext, key);
    const encrypted2 = await encrypt(plaintext, key);

    // Different IVs should produce different ciphertext
    expect(encrypted1.data).not.toEqual(encrypted2.data);
    expect(encrypted1.iv).not.toEqual(encrypted2.iv);

    // But both should decrypt to same plaintext
    expect(await decrypt(encrypted1, key)).toBe(plaintext);
    expect(await decrypt(encrypted2, key)).toBe(plaintext);
  });

  it('should fail decryption with wrong key', async () => {
    const plaintext = 'Hello, World!';
    const encrypted = await encrypt(plaintext, key);

    // Create different key
    const wrongKey = await deriveKey('wrong-password', generateSalt());

    await expect(decrypt(encrypted, wrongKey)).rejects.toThrow(DecryptionError);
  });

  it('should fail decryption with tampered data', async () => {
    const plaintext = 'Hello, World!';
    const encrypted = await encrypt(plaintext, key);

    // Tamper with the data
    encrypted.data[0] ^= 1;

    await expect(decrypt(encrypted, key)).rejects.toThrow(DecryptionError);
  });

  it('should fail decryption with tampered IV', async () => {
    const plaintext = 'Hello, World!';
    const encrypted = await encrypt(plaintext, key);

    // Tamper with the IV
    encrypted.iv[0] ^= 1;

    await expect(decrypt(encrypted, key)).rejects.toThrow(DecryptionError);
  });

  it('should throw ValidationError for invalid inputs', async () => {
    await expect(encrypt(null as any, key)).rejects.toThrow(ValidationError);
    await expect(encrypt(undefined as any, key)).rejects.toThrow(ValidationError);
    await expect(encrypt('test', null as any)).rejects.toThrow(ValidationError);
  });
});

describe('encryptFile and decryptFile', () => {
  let key: CryptoKey;

  beforeEach(async () => {
    const password = 'test-password-123';
    const salt = generateSalt();
    key = await deriveKey(password, salt);
  });

  it('should encrypt and decrypt binary file data', async () => {
    const fileData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const encrypted = await encryptFile(fileData, key);
    const decrypted = await decryptFile(encrypted, key);

    expect(decrypted).toEqual(fileData);
  });

  it('should handle large binary data', async () => {
    const largeData = new Uint8Array(1024 * 1024); // 1MB
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256;
    }

    const encrypted = await encryptFile(largeData, key);
    const decrypted = await decryptFile(encrypted, key);

    expect(decrypted).toEqual(largeData);
  });
});

describe('encryptObject and decryptObject', () => {
  let key: CryptoKey;

  beforeEach(async () => {
    const password = 'test-password-123';
    const salt = generateSalt();
    key = await deriveKey(password, salt);
  });

  it('should encrypt and decrypt an object', async () => {
    const obj = {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
    };

    const encrypted = await encryptObject(obj, key);
    const decrypted = await decryptObject<typeof obj>(encrypted, key);

    expect(decrypted).toEqual(obj);
  });

  it('should encrypt and decrypt nested objects', async () => {
    const obj = {
      user: {
        name: 'John Doe',
        profile: {
          age: 30,
          address: {
            city: 'New York',
            country: 'USA',
          },
        },
      },
      metadata: {
        created: '2024-01-01',
        tags: ['important', 'secure'],
      },
    };

    const encrypted = await encryptObject(obj, key);
    const decrypted = await decryptObject<typeof obj>(encrypted, key);

    expect(decrypted).toEqual(obj);
  });

  it('should encrypt and decrypt arrays', async () => {
    const arr = [1, 2, 3, 4, 5];

    const encrypted = await encryptObject(arr, key);
    const decrypted = await decryptObject<typeof arr>(encrypted, key);

    expect(decrypted).toEqual(arr);
  });

  it('should throw ValidationError for null object', async () => {
    await expect(encryptObject(null, key)).rejects.toThrow(ValidationError);
    await expect(encryptObject(undefined, key)).rejects.toThrow(ValidationError);
  });
});
