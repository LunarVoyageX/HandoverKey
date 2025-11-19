# Validation Layer Documentation

This directory contains the Zod-based validation layer for the HandoverKey API.

## Overview

The validation layer provides:

- Runtime type validation using Zod schemas
- Input sanitization to prevent XSS attacks
- Consistent error formatting
- Type-safe validation middleware

## Structure

```
validation/
├── middleware.ts           # Validation middleware factory
├── sanitization.ts         # Advanced sanitization utilities
├── schemas/               # Zod schema definitions
│   ├── auth.schemas.ts    # Authentication schemas
│   ├── vault.schemas.ts   # Vault entry schemas
│   ├── inactivity.schemas.ts  # Inactivity settings schemas
│   ├── activity.schemas.ts    # Activity schemas
│   └── index.ts          # Central schema exports
├── __tests__/            # Unit tests
│   └── middleware.test.ts
└── index.ts              # Central exports

```

## Usage

### Basic Validation

```typescript
import { validateRequest } from "../validation";
import { CreateVaultEntrySchema } from "../validation/schemas";

router.post(
  "/entries",
  validateRequest(CreateVaultEntrySchema, "body"),
  VaultController.createEntry,
);
```

### Multiple Target Validation

```typescript
import { validateMultiple } from "../validation";
import {
  VaultEntryIdSchema,
  UpdateVaultEntrySchema,
} from "../validation/schemas";

router.put(
  "/entries/:id",
  validateMultiple({
    params: VaultEntryIdSchema,
    body: UpdateVaultEntrySchema,
  }),
  VaultController.updateEntry,
);
```

### Query Parameter Validation

```typescript
import { validateRequest } from "../validation";
import { VaultQuerySchema } from "../validation/schemas";

router.get(
  "/entries",
  validateRequest(VaultQuerySchema, "query"),
  VaultController.getEntries,
);
```

## Features

### Input Sanitization

All string inputs are automatically sanitized to prevent XSS attacks:

- HTML tags are stripped
- Script content is removed
- Event handlers are removed
- JavaScript protocol URLs are removed
- Control characters are removed
- HTML entities are decoded and re-sanitized

### Advanced Sanitization Utilities

The `sanitization.ts` module provides specialized sanitization functions:

```typescript
import {
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeBase64,
  sanitizeUuid,
  sanitizePhoneNumber,
  sanitizeStringArray,
} from "../validation";

// Sanitize and validate email
const email = sanitizeEmail(userInput); // Returns null if invalid

// Sanitize URL (blocks dangerous protocols)
const url = sanitizeUrl(userInput); // Returns null if invalid

// Sanitize filename (prevents path traversal)
const filename = sanitizeFilename(userInput);

// Validate base64 strings
const base64 = sanitizeBase64(userInput);
```

### File Upload Validation

Validate file uploads for security:

```typescript
import { validateFileUpload } from "../validation";

const result = validateFileUpload(file, {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/png"],
  allowedExtensions: ["jpg", "jpeg", "png"],
});

if (!result.valid) {
  return res.status(400).json({ error: result.error });
}
```

### Error Formatting

Validation errors are returned in a consistent format:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ],
  "requestId": "abc-123"
}
```

### Type Safety

All validated data is type-safe and can be used with confidence in controllers:

```typescript
// After validation, req.body is typed according to the schema
const { email, password } = req.body; // TypeScript knows these types
```

## Available Schemas

### Authentication

- `RegisterSchema` - User registration
- `LoginSchema` - User login
- `RefreshTokenSchema` - Token refresh
- `PasswordResetRequestSchema` - Request password reset
- `PasswordResetConfirmSchema` - Confirm password reset with token
- `PasswordChangeSchema` - Change password (authenticated user)

### Vault

- `CreateVaultEntrySchema` - Create vault entry (with size limits and validation)
- `UpdateVaultEntrySchema` - Update vault entry (partial updates)
- `VaultQuerySchema` - Query parameters for listing entries (with sorting)
- `VaultEntryIdSchema` - Vault entry ID parameter

### Inactivity & Handover

- `UpdateInactivitySettingsSchema` - Update inactivity settings
- `PauseSwitchSchema` - Pause dead man's switch
- `ResumeSwitchSchema` - Resume dead man's switch
- `ConfigureThresholdSchema` - Configure handover threshold and warnings
- `AddSuccessorSchema` - Add a successor
- `UpdateSuccessorSchema` - Update successor information
- `SuccessorIdSchema` - Successor ID parameter

### Activity

- `CheckInSchema` - Manual check-in

## Testing

Run validation tests:

```bash
npm test -- validation/__tests__/middleware.test.ts
```

## Migration from express-validator

The old `express-validator` validation has been replaced with Zod. Key differences:

1. **Type Safety**: Zod provides compile-time type checking
2. **Sanitization**: Built-in input sanitization
3. **Consistency**: All validation uses the same pattern
4. **Better Errors**: More detailed and consistent error messages

## Requirements Addressed

- **Requirement 3.1**: Runtime input validation with schema validation library
- **Requirement 3.2**: 400 status code with specific validation errors
- **Requirement 3.3**: Validation schemas for all API endpoints
- **Requirement 3.4**: Data type, required field, string length, and format validation
- **Requirement 3.5**: Input sanitization to prevent XSS and injection attacks
