# HandoverKey Security Model

This document describes the security controls that are implemented in the current
repository. If a control is not shipped yet, it is listed under "Future Hardening" and
not presented as active behavior.

## Security Principles

- keep vault plaintext on the client whenever possible
- separate authentication from vault encryption concerns
- fail fast on missing critical secrets
- validate and sanitize all incoming data
- keep auth, inactivity, and handover actions auditable

## Implemented Controls

### Client-Side Vault Encryption

- Vault entries are encrypted in the client before they are sent to the API.
- Encryption uses AES-256-GCM through the shared crypto package.
- Key derivation uses PBKDF2 with SHA-256.
- The server stores encrypted payloads, IVs, salts, metadata, and related records, but
  does not need plaintext vault content for normal operation.

### Password And Auth Handling

- Server-side password storage uses bcrypt.
- Browser authentication uses httpOnly JWT cookies.
- API clients may also authenticate with `Authorization: Bearer <token>`.
- Protected routes validate both the token and the backing session record.
- Refresh tokens are path-scoped to `/api/v1/auth/refresh`.

### Session Management

- Every login creates a tracked server-side session.
- Users can view active sessions, revoke one session, or invalidate all other sessions.
- Session cleanup runs as a background maintenance task.

### Two-Factor Authentication

- TOTP 2FA is implemented.
- Users can start setup, scan an otpauth QR code, enable 2FA, disable it later, and use
  recovery codes if they lose the authenticator device.
- The default issuer label is configurable through `TWO_FACTOR_ISSUER`.

### Account Lockout

- Failed login attempts are tracked.
- After 5 failed attempts inside a 15-minute window, the account is locked for 15
  minutes.
- Lockout state is stored in Redis and mirrored to the user record.
- Admin users can inspect and unlock locked accounts.

### Rate Limiting

Current implementation uses `express-rate-limit` middleware:

- general API limiter
- stricter auth limiter
- registration limiter
- contact form limiter

Important note:

- the current limiter uses in-process memory, not a distributed Redis-backed store
- for multi-instance production deployments, pair this with an edge/WAF rate limiter or
  upgrade to a shared store

### Input Validation And Sanitization

- Request schemas are validated with Zod.
- Content type is checked for JSON mutation routes.
- Input sanitization removes dangerous HTML/script patterns and strips suspicious
  protocols and event handlers.
- Prototype-pollution keys such as `__proto__`, `constructor`, and `prototype` are
  explicitly rejected.

### Logging And Auditability

- The API uses structured Pino logging.
- Activity records are HMAC-signed with `ACTIVITY_HMAC_SECRET` for integrity checking.
- Activity history is queryable through the authenticated activity endpoints.
- Old records may be cleaned up by retention jobs, so these logs should be treated as
  integrity-protected operational records, not immutable archival storage.

### Inactivity And Handover Protections

- User activity comes from both authenticated actions and explicit check-ins.
- Manual check-in and secure emailed check-in links can reset inactivity state.
- Active grace-period handovers are canceled when the user checks in again.
- Successors must verify their identity before accessing successor flows.
- Owners can restrict each successor to assigned vault entries only.

### Transport And Browser Security

- Production cookies are marked secure and configured for hosted browser usage.
- CORS uses an explicit allowlist through `CORS_ORIGINS`.
- The API does not rely on permissive wildcard origins.

## Operational Security Notes

- `JWT_SECRET` and `ACTIVITY_HMAC_SECRET` are required startup secrets.
- PostgreSQL and Redis should run over trusted private networking or TLS-capable managed
  services, depending on deployment.
- SMTP credentials are sensitive and should come from a secrets manager or deployment
  secret store.
- Admin access is currently controlled by the `ADMIN_EMAILS` allowlist.

## Known Limitations

- Rate limiting is not yet backed by a distributed store.
- Admin authorization is allowlist-based rather than a full role model.
- The repository does not currently ship WebAuthn / passkeys.
- CSP, HSTS, and other browser-facing security headers are expected to be enforced by
  the frontend host or reverse proxy if needed for deployment.

## Future Hardening

Likely future improvements include:

- WebAuthn / passkey support
- distributed rate limiting
- richer role-based authorization
- external security review / penetration testing
- stronger deployment-level security header baselines

## Reporting Vulnerabilities

Do not open public issues for security problems.

Please follow [`../SECURITY.md`](../SECURITY.md) and email
`security@handoverkey.com`.

---

**Last Updated**: 2026-03-18
**Version**: 2.0.0
