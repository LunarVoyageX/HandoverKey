# @handoverkey/database

Type-safe database operations with Kysely for HandoverKey.

## Overview

This package provides a type-safe database layer using Kysely, a type-safe SQL query builder for TypeScript. It includes connection management, repositories, and migrations.

## Features

- **Type-Safe Queries**: Compile-time type checking for all SQL queries
- **Connection Pooling**: Efficient connection management with pg
- **Repository Pattern**: Clean data access layer
- **Migrations**: Database schema versioning
- **Health Checks**: Connection monitoring
- **Transaction Support**: ACID-compliant transactions
- **Zero SQL Injection**: Parameterized queries by default

## Installation

```bash
npm install @handoverkey/database
```

## Usage

### Database Client

```typescript
import { getDatabaseClient } from "@handoverkey/database";

// Get singleton instance
const db = getDatabaseClient();

// Initialize connection
await db.initialize({
  host: "localhost",
  port: 5432,
  database: "handoverkey",
  user: "postgres",
  password: "password",
  min: 2, // Minimum connections
  max: 10, // Maximum connections
});

// Health check
const isHealthy = await db.healthCheck();

// Close connections
await db.close();
```

### Repositories

```typescript
import { UserRepository, VaultEntryRepository } from "@handoverkey/database";

// User operations
const user = await UserRepository.findById("user-id");
const userByEmail = await UserRepository.findByEmail("user@example.com");

const newUser = await UserRepository.create({
  email: "new@example.com",
  passwordHash: "hashed-password",
  salt: Buffer.from("salt"),
});

await UserRepository.update("user-id", {
  lastLogin: new Date(),
});

// Vault operations
const entries = await VaultEntryRepository.findByUserId("user-id");

const entry = await VaultEntryRepository.create({
  userId: "user-id",
  encryptedData: Buffer.from("encrypted"),
  iv: Buffer.from("iv"),
  salt: Buffer.from("salt"),
  algorithm: "AES-256-GCM",
  sizeBytes: 1024,
});

await VaultEntryRepository.update("entry-id", {
  encryptedData: Buffer.from("new-encrypted"),
});

await VaultEntryRepository.delete("entry-id"); // Soft delete
```

### Transactions

```typescript
import { getDatabaseClient } from "@handoverkey/database";

const db = getDatabaseClient();

await db.transaction(async (trx) => {
  // All operations use the same transaction
  const user = await trx
    .selectFrom("users")
    .where("id", "=", userId)
    .selectAll()
    .executeTakeFirst();

  await trx
    .insertInto("activity_logs")
    .values({
      userId: user.id,
      action: "LOGIN",
      timestamp: new Date(),
    })
    .execute();

  // Transaction commits automatically if no error
  // Rolls back automatically on error
});
```

### Direct Queries

```typescript
import { getDatabaseClient } from "@handoverkey/database";

const db = getDatabaseClient();

// Type-safe query
const users = await db.query((db) =>
  db
    .selectFrom("users")
    .where("email", "like", "%@example.com")
    .where("deletedAt", "is", null)
    .selectAll()
    .execute(),
);
```

## API Reference

### DatabaseClient

#### `initialize(config)`

Initializes the database connection pool.

**Parameters:**

- `config.host: string` - Database host
- `config.port: number` - Database port
- `config.database: string` - Database name
- `config.user: string` - Database user
- `config.password: string` - Database password
- `config.min?: number` - Minimum pool connections (default: 2)
- `config.max?: number` - Maximum pool connections (default: 10)

**Returns:** `Promise<void>`

#### `query<T>(queryFn)`

Executes a query with type safety.

**Parameters:**

- `queryFn: (db: Kysely<Database>) => Promise<T>` - Query function

**Returns:** `Promise<T>` - Query result

#### `transaction<T>(txFn)`

Executes operations in a transaction.

**Parameters:**

- `txFn: (trx: Transaction<Database>) => Promise<T>` - Transaction function

**Returns:** `Promise<T>` - Transaction result

#### `healthCheck()`

Checks database connectivity.

**Returns:** `Promise<boolean>` - True if healthy

#### `close()`

Closes all database connections.

**Returns:** `Promise<void>`

### Repositories

All repositories follow the same pattern:

#### UserRepository

- `findById(id: string): Promise<User | null>`
- `findByEmail(email: string): Promise<User | null>`
- `create(data: CreateUserData): Promise<User>`
- `update(id: string, data: UpdateUserData): Promise<User>`
- `delete(id: string): Promise<void>` - Soft delete

#### VaultEntryRepository

- `findById(id: string): Promise<VaultEntry | null>`
- `findByUserId(userId: string): Promise<VaultEntry[]>`
- `create(data: CreateVaultEntryData): Promise<VaultEntry>`
- `update(id: string, data: UpdateVaultEntryData): Promise<VaultEntry>`
- `delete(id: string): Promise<void>` - Soft delete

#### SessionRepository

- `findById(id: string): Promise<Session | null>`
- `findByUserId(userId: string): Promise<Session[]>`
- `create(data: CreateSessionData): Promise<Session>`
- `update(id: string, data: UpdateSessionData): Promise<Session>`
- `delete(id: string): Promise<void>` - Hard delete
- `deleteExpired(): Promise<number>` - Cleanup expired sessions

#### ActivityLogRepository

- `findById(id: string): Promise<ActivityLog | null>`
- `findByUserId(userId: string, limit?: number): Promise<ActivityLog[]>`
- `create(data: CreateActivityLogData): Promise<ActivityLog>`

## Database Schema

### Tables

#### users

- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Bcrypt password hash
- `salt` - Encryption salt
- `two_factor_enabled` - 2FA status
- `two_factor_secret` - 2FA secret
- `last_login` - Last login timestamp
- `inactivity_threshold_days` - Inactivity threshold
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp
- `deleted_at` - Soft delete timestamp

#### vault_entries

- `id` - UUID primary key
- `user_id` - Foreign key to users
- `encrypted_data` - Encrypted vault data
- `iv` - Initialization vector
- `salt` - Encryption salt
- `algorithm` - Encryption algorithm
- `category` - Entry category
- `tags` - Array of tags
- `size_bytes` - Data size
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp
- `deleted_at` - Soft delete timestamp

#### sessions

- `id` - UUID primary key
- `user_id` - Foreign key to users
- `token_hash` - Hashed session token
- `expires_at` - Expiration timestamp
- `ip_address` - Client IP
- `user_agent` - Client user agent
- `created_at` - Creation timestamp
- `last_activity` - Last activity timestamp

#### activity_logs

- `id` - UUID primary key
- `user_id` - Foreign key to users
- `action` - Action type
- `ip_address` - Client IP
- `user_agent` - Client user agent
- `metadata` - Additional data (JSONB)
- `timestamp` - Action timestamp

## Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback
```

### Creating Migrations

Migrations are TypeScript files in `src/migrations/`:

```typescript
import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("new_table")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("new_table").execute();
}
```

## Connection Management

### Connection Pooling

The database client uses pg's connection pooling:

- **Minimum Connections**: 2 (configurable)
- **Maximum Connections**: 10 (configurable)
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 30 seconds

### Retry Logic

Failed connections are retried with exponential backoff:

- **Max Retries**: 3
- **Initial Delay**: 1 second
- **Max Delay**: 30 seconds
- **Backoff Factor**: 2x

### Health Checks

The health check performs a simple query to verify connectivity:

```typescript
const isHealthy = await db.healthCheck();
```

## Error Handling

```typescript
import { DatabaseError } from "@handoverkey/database";

try {
  const user = await UserRepository.findById("user-id");
} catch (error) {
  if (error instanceof DatabaseError) {
    // Database operation failed
    console.error("Database error:", error.message);
  }
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Best Practices

1. **Use Repositories**: Prefer repository methods over direct queries
2. **Use Transactions**: Wrap related operations in transactions
3. **Soft Deletes**: Use soft deletes for user data (set `deleted_at`)
4. **Indexes**: Ensure proper indexes for query performance
5. **Connection Pooling**: Configure pool size based on load
6. **Health Checks**: Monitor database health regularly

## Performance

- **Type Safety**: Zero runtime overhead - all type checking at compile time
- **Connection Pooling**: Reuses connections for better performance
- **Prepared Statements**: All queries use parameterized queries
- **Indexes**: Proper indexes on foreign keys and frequently queried columns

## License

MIT

## Contributing

See the main [Contributing Guidelines](../../CONTRIBUTING.md).
