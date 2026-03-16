# HandoverKey - Security Model

## 1. Introduction

This document describes the **implemented** security model of HandoverKey. Features listed in the [Roadmap](#9-security-roadmap) section are planned but not yet implemented.

## 2. Core Security Principles

### 2.1 Zero-Knowledge Architecture

- All sensitive user data (passwords, documents, notes) is encrypted **client-side** using AES-256-GCM before transmission to the server.
- The server stores only encrypted blobs and cannot decrypt them.
- Master encryption keys are derived from the user's password using PBKDF2 with 100,000+ iterations and a unique salt per user.
- The master key **never** leaves the client device.

### 2.2 Key Separation

- **Authentication Key**: Derived from the password with a lower iteration count, used only to prove identity to the server. The server stores a bcrypt hash of this key.
- **Master Encryption Key**: Derived from the password with a different salt and higher iteration count, used to encrypt/decrypt vault data. The server never sees this key.
- Because the derivation parameters differ, compromising the server's auth key hash does not enable derivation of the master encryption key.

## 3. Encryption Architecture

### 3.1 Data Encryption

- **Algorithm**: AES-256-GCM (via Web Crypto API in the browser)
- **IV**: Unique cryptographically random IV per encryption operation
- **Integrity**: GCM mode provides authenticated encryption (confidentiality + integrity)
- **Implementation**: `packages/crypto/src/encryption.ts`

### 3.2 Key Derivation

- **Algorithm**: PBKDF2 with SHA-256
- **Iterations**: 100,000+ for encryption key, 10,000 for auth key
- **Salt**: Cryptographically random, unique per user, stored server-side
- **Implementation**: `packages/crypto/src/encryption.ts`

### 3.3 Shamir's Secret Sharing

- The user's master key (or a derived handover key) is split into N shares with a threshold K.
- Any K of N shares can reconstruct the key; fewer than K shares reveal nothing.
- Each successor receives one encrypted share.
- **Implementation**: `packages/crypto/src/shamir.ts`

## 4. Authentication

### 4.1 Password Handling

- Passwords are hashed using **bcrypt** (configurable rounds, default 12) on the server.
- The client sends a PBKDF2-derived auth key, not the raw password.

### 4.2 Session Management

- **JWT access tokens**: Short-lived (default 1 hour), used for API authentication.
- **Refresh tokens**: Longer-lived (default 7 days), used to obtain new access tokens.
- **Server-side session tracking**: Each JWT is associated with a database session record. Token validity is checked against the session table on each request.
- Sessions can be individually or bulk-invalidated by the user.

### 4.3 Account Lockout

- Failed login attempts are tracked per user.
- After a configurable number of failures, the account is temporarily locked with exponential backoff.
- Lockout status is stored server-side and can be cleared by an admin.

### 4.4 Rate Limiting

- Auth endpoints: 5 requests per 15-minute window
- Validation endpoints: 20 requests per 5-minute window
- General API: 100 requests per 15-minute window
- Implemented via `express-rate-limit` backed by Redis.

## 5. Input Validation and Sanitization

- Request bodies are validated using **Zod** schemas (`apps/api/src/validation/schemas/`).
- Input is sanitized against XSS using DOMPurify (`isomorphic-dompurify`).
- Content-Type validation middleware rejects non-JSON requests on API endpoints.
- Request IDs are attached to all requests for audit trail correlation.

## 6. Error Handling

- Custom error hierarchy (`AppError`, `AuthenticationError`, `ValidationError`, etc.) ensures consistent error responses.
- Production error responses never expose stack traces or internal details.
- Structured logging via Pino with PII redaction (authorization headers, passwords, tokens are redacted from logs).

## 7. Infrastructure Security

- **Database**: PostgreSQL with connection pooling (Kysely). Query retry logic with exponential backoff for transient failures.
- **Cache/Queue**: Redis for session caching, rate limiting, and BullMQ job queues.
- **Docker**: Multi-stage builds for minimal production images.
- **Dependencies**: Dependabot monitors for vulnerable dependencies weekly.

## 8. Dead Man's Switch Security

- User activity is recorded via check-ins (login, manual check-in, API activity).
- Inactivity thresholds are user-configurable.
- When the threshold is exceeded, a grace period begins before handover is initiated.
- Successors must verify their identity (email verification) before receiving vault access.
- All handover events are logged for audit purposes.

## 9. Security Roadmap

The following features are **planned but not yet implemented**:

- **Multi-Factor Authentication (TOTP)**: Authenticator app support for login. (Stub exists in auth flow, verification not implemented.)
- **WebAuthn/FIDO2**: Hardware security key support (YubiKey, etc.).
- **Role-Based Access Control**: Currently admin routes require an email allowlist; a proper role system is planned.
- **HSTS / CSP Headers**: HTTP security headers for the web application.
- **Argon2 Migration**: Migrating from bcrypt to Argon2id for password hashing.
- **Encrypted Audit Logs**: Cryptographic signing of activity logs.
- **SOC 2 / Penetration Testing**: Third-party security audits.

## 10. Reporting Vulnerabilities

**Do not open GitHub issues for security vulnerabilities.**

Please email the maintainers directly or refer to our [Security Policy](../SECURITY.md).

---

**Last Updated**: March 2026
**Version**: 2.0
