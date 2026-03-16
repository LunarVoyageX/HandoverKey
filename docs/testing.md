# Testing Guide

Comprehensive testing strategy for HandoverKey.

## Philosophy

- **Security First**: Rigorous testing of encryption, authentication, and authorization
- **Test what matters**: Core functionality and critical user paths
- **Reliability**: Integration tests with real PostgreSQL and Redis
- **Fast feedback**: Tests run in under 15 seconds locally

## Running Tests

```bash
# Run all tests across the monorepo
npm test

# Run tests for a specific workspace
npm test --workspace=@handoverkey/api
npm test --workspace=@handoverkey/web
npm test --workspace=@handoverkey/crypto
npm test --workspace=@handoverkey/database

# Run with coverage
npm run test:coverage --workspace=@handoverkey/crypto

# Lint and format
npm run lint
npm run format
```

### Integration Tests (API)

API integration tests require PostgreSQL and Redis. Start them first:

```bash
npm run docker:up
```

Then run with `NODE_ENV=test` to use the JSON email transport (avoids SMTP timeouts):

```bash
NODE_ENV=test npm test --workspace=@handoverkey/api
```

## Test Structure

### API Tests (`apps/api/src/**/*.test.ts`)

| File                           | Coverage                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `auth.test.ts`                 | Registration, login rejection (mocked)                                             |
| `auth-full.test.ts`            | Profile, logout, refresh, resend verification, forgot password, delete account     |
| `vault-and-successors.test.ts` | Vault CRUD with successor management                                               |
| `vault-crud.test.ts`           | Create, get-by-id, update, soft-delete vault entries                               |
| `handover-flow.test.ts`        | Encrypted shares, handover initiation/cancellation, grace period, successor access |
| `sessions-activity.test.ts`    | Session listing, invalidation, activity logs, check-in, inactivity settings        |
| `errors.test.ts`               | Custom error class hierarchy                                                       |
| `error-handler.test.ts`        | Global error handler middleware                                                    |
| `middleware.test.ts`           | Zod validation and input sanitization                                              |
| `validation.test.ts`           | Email and UUID validators                                                          |

### Web Tests (`apps/web/src/**/*.test.{ts,tsx}`)

- App rendering and navigation
- Auth flow (login, register) with cookie-based auth
- Vault flow (fetch entries, add new entry)

### Package Tests

- **`packages/crypto`**: AES-256-GCM encrypt/decrypt, PBKDF2 key derivation, Shamir's Secret Sharing
- **`packages/database`**: Error hierarchy, `DatabaseClient` singleton behavior
- **`packages/shared`**: Utility functions and type validation

## Test Environment

- `NODE_ENV=test` enables JSON email transport (no real SMTP connections)
- Rate limiters are relaxed in non-production environments
- Integration tests create a fresh `handoverkey_test` database via the global setup script
- Each test file manages its own database connection pool and Redis client

## CI/CD

GitHub Actions runs the full test suite on every PR and push to `main`:

1. **Lint & Format** (parallel) -- ESLint + Prettier check
2. **Build** (parallel) -- TypeScript compilation for all packages
3. **Test** (after build) -- Full test suite with PostgreSQL 16 and Redis 7 service containers

## Writing Tests

### Integration Test Pattern

```typescript
import request from "supertest";
import app, { appInit } from "../../app";
import { getDatabaseClient } from "@handoverkey/database";
import { SessionService } from "../../services/session-service";
import { initializeRedis, closeRedis } from "../../config/redis";

describe("Feature Integration", () => {
  beforeAll(async () => {
    const dbClient = getDatabaseClient();
    await dbClient.initialize({
      /* test DB config */
    });
    SessionService.initialize(dbClient);
    await initializeRedis();
    await appInit;
  });

  afterAll(async () => {
    await closeRedis();
    await getDatabaseClient().close();
  });

  it("should do something", async () => {
    const res = await request(app)
      .post("/api/v1/endpoint")
      .send({ key: "value" });
    expect(res.status).toBe(200);
  });
});
```

### Guidelines

- Test the happy path first, then obvious failure cases
- Use `registerVerifyLogin()` helpers to avoid duplicating auth boilerplate
- Always send `.send({})` on POST requests to set Content-Type
- Extract tokens from `Set-Cookie` headers (httpOnly cookie auth)
- Keep tests focused: one behavior per test
