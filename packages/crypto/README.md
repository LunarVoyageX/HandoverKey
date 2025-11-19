# @handoverkey/crypto

Unified cryptographic operations using Web Crypto API.

## Features

- AES-256-GCM encryption/decryption
- PBKDF2 key derivation (100k+ iterations)
- Shamir's Secret Sharing
- Works in browser and Node.js 15+
- Zero dependencies

## Usage

```typescript
import { encrypt, decrypt, deriveKey, generateSalt } from "@handoverkey/crypto";

// Derive key from password
const salt = generateSalt();
const key = await deriveKey("password", salt);

// Encrypt/decrypt
const encrypted = await encrypt("data", key);
const decrypted = await decrypt(encrypted, key);

// Shamir's Secret Sharing (5 shares, need 3)
import { splitSecret, reconstructSecret } from "@handoverkey/crypto";
const shares = splitSecret(secret, 5, 3);
const reconstructed = reconstructSecret([shares[0], shares[2], shares[4]]);
```

## API

- `encrypt(data, key)` - AES-256-GCM encryption
- `decrypt(encryptedData, key)` - Decryption
- `deriveKey(password, salt, iterations?)` - PBKDF2 key derivation
- `splitSecret(secret, shares, threshold)` - Split secret
- `reconstructSecret(shares)` - Reconstruct secret
- `generateSalt()` - Random 16-byte salt
- `generateIV()` - Random 12-byte IV
- `hash(data)` - SHA-256 hash

## Security

- AES-256-GCM with random IVs
- PBKDF2-SHA256 with 100k iterations
- Always use random salts (never reuse)
- Never store derived keys

## Browser Support

Chrome 37+, Firefox 34+, Safari 11+, Edge 79+, Node.js 15+

## License

MIT
