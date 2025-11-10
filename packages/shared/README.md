# @handoverkey/shared

Shared types and utilities for HandoverKey.

## Overview

This package contains shared TypeScript types, interfaces, and utility functions used across the HandoverKey monorepo. It ensures consistency between frontend and backend code.

## Features

- **Shared Types**: Common interfaces and types
- **Validation Utilities**: Reusable validation functions
- **Constants**: Shared constants and enums
- **Type-Safe**: Full TypeScript support
- **Zero Dependencies**: Lightweight package

## Installation

```bash
npm install @handoverkey/shared
```

## Usage

### Types

```typescript
import type {
  User,
  VaultEntry,
  ActivityLog,
  HandoverEvent,
  InactivitySettings,
} from '@handoverkey/shared';

// User type
const user: User = {
  id: 'user-id',
  email: 'user@example.com',
  twoFactorEnabled: false,
  inactivityThresholdDays: 90,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Vault entry type
const entry: VaultEntry = {
  id: 'entry-id',
  userId: 'user-id',
  encryptedData: 'base64-encrypted-data',
  iv: 'base64-iv',
  salt: 'base64-salt',
  algorithm: 'AES-256-GCM',
  category: 'passwords',
  tags: ['important', 'work'],
  sizeBytes: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Validation Utilities

```typescript
import { validateEmail, isValidUUID, sanitizeString } from '@handoverkey/shared';

// Email validation
const isValid = validateEmail('user@example.com'); // true
const isInvalid = validateEmail('invalid-email'); // false

// UUID validation
const isValidId = isValidUUID('123e4567-e89b-12d3-a456-426614174000'); // true
const isInvalidId = isValidUUID('not-a-uuid'); // false

// String sanitization
const clean = sanitizeString('<script>alert("xss")</script>'); // 'alert("xss")'
```

### Constants

```typescript
import {
  DEFAULT_INACTIVITY_THRESHOLD_DAYS,
  MAX_VAULT_ENTRY_SIZE_BYTES,
  SUPPORTED_ALGORITHMS,
  ActivityAction,
} from '@handoverkey/shared';

// Constants
console.log(DEFAULT_INACTIVITY_THRESHOLD_DAYS); // 90
console.log(MAX_VAULT_ENTRY_SIZE_BYTES); // 10485760 (10MB)
console.log(SUPPORTED_ALGORITHMS); // ['AES-256-GCM']

// Enums
const action: ActivityAction = ActivityAction.LOGIN;
```

## API Reference

### Types

#### User

```typescript
interface User {
  id: string;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLogin?: Date;
  inactivityThresholdDays: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

#### VaultEntry

```typescript
interface VaultEntry {
  id: string;
  userId: string;
  encryptedData: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
  algorithm: string;
  category?: string;
  tags?: string[];
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

#### ActivityLog

```typescript
interface ActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
```

#### InactivitySettings

```typescript
interface InactivitySettings {
  thresholdDays: number;
  requireMajority: boolean;
  isPaused: boolean;
  pausedUntil?: Date;
}
```

### Enums

#### ActivityAction

```typescript
enum ActivityAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  VAULT_ACCESS = 'VAULT_ACCESS',
  VAULT_CREATE = 'VAULT_CREATE',
  VAULT_UPDATE = 'VAULT_UPDATE',
  VAULT_DELETE = 'VAULT_DELETE',
  SETTINGS_ACCESS = 'SETTINGS_ACCESS',
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  PROFILE_ACCESS = 'PROFILE_ACCESS',
  CHECK_IN = 'CHECK_IN',
}
```

### Validation Functions

#### `validateEmail(email: string): boolean`

Validates email format using RFC 5322 compliant regex.

**Parameters:**
- `email: string` - Email address to validate

**Returns:** `boolean` - True if valid email format

**Example:**
```typescript
validateEmail('user@example.com'); // true
validateEmail('invalid'); // false
```

#### `isValidUUID(uuid: string): boolean`

Validates UUID v4 format.

**Parameters:**
- `uuid: string` - UUID to validate

**Returns:** `boolean` - True if valid UUID v4

**Example:**
```typescript
isValidUUID('123e4567-e89b-12d3-a456-426614174000'); // true
isValidUUID('not-a-uuid'); // false
```

#### `sanitizeString(input: string): string`

Sanitizes string by removing HTML tags and dangerous characters.

**Parameters:**
- `input: string` - String to sanitize

**Returns:** `string` - Sanitized string

**Example:**
```typescript
sanitizeString('<script>alert("xss")</script>'); // 'alert("xss")'
sanitizeString('Hello <b>World</b>'); // 'Hello World'
```

### Constants

#### Inactivity

- `DEFAULT_INACTIVITY_THRESHOLD_DAYS: 90` - Default inactivity threshold
- `MIN_INACTIVITY_THRESHOLD_DAYS: 30` - Minimum threshold
- `MAX_INACTIVITY_THRESHOLD_DAYS: 365` - Maximum threshold

#### Vault

- `MAX_VAULT_ENTRY_SIZE_BYTES: 10485760` - Max entry size (10MB)
- `MAX_VAULT_ENTRIES_PER_USER: 10000` - Max entries per user
- `SUPPORTED_ALGORITHMS: ['AES-256-GCM']` - Supported encryption algorithms

#### Security

- `PBKDF2_ITERATIONS: 100000` - PBKDF2 iteration count
- `SALT_LENGTH_BYTES: 16` - Salt length
- `IV_LENGTH_BYTES: 12` - IV length for AES-GCM
- `SESSION_EXPIRY_HOURS: 24` - Session expiry time

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Usage in Monorepo

This package is used by:

- **@handoverkey/api**: Backend API types and validation
- **@handoverkey/web**: Frontend types and utilities
- **@handoverkey/crypto**: Shared crypto constants
- **@handoverkey/database**: Database type definitions

## Best Practices

1. **Type-Only Imports**: Use `import type` for types to avoid runtime imports
2. **Shared Constants**: Define constants here to avoid duplication
3. **Validation**: Use shared validation functions for consistency
4. **Enums**: Use enums for fixed sets of values
5. **Documentation**: Document all exported types and functions

## Contributing

When adding new shared code:

1. Ensure it's truly shared (used by 2+ packages)
2. Add TypeScript types and JSDoc comments
3. Add unit tests for utility functions
4. Update this README

See the main [Contributing Guidelines](../../CONTRIBUTING.md).

## License

MIT
