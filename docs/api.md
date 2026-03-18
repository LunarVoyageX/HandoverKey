# HandoverKey API Reference

This document describes the current `v2.0.0` API surface implemented in
`apps/api`.

## Base URLs

- Local development: `http://localhost:3001/api/v1`
- Production example: `https://api.handoverkey.com/api/v1`

The web app uses `VITE_API_URL` in production. In local development, the Vite dev
server proxies `/api` to the API server.

## Authentication Model

HandoverKey supports two auth patterns:

- **Browser clients** use httpOnly cookies set by the API (`accessToken`,
  `refreshToken`).
- **Programmatic clients** can also pass `Authorization: Bearer <token>`.

Protected endpoints validate both the JWT and the backing server-side session.

### Cookie behavior

- `accessToken`: short-lived auth cookie
- `refreshToken`: scoped to `/api/v1/auth/refresh`
- production cookies are `secure` and `SameSite=None`

### Authentication flow

1. `POST /auth/register`
2. `GET /auth/verify-email?token=...`
3. `POST /auth/login`
4. API sets auth cookies and returns the authenticated user payload
5. Browser calls `GET /auth/profile` to hydrate session state

If TOTP is enabled, login accepts either a `twoFactorCode` or a `recoveryCode`.

## Common Response Conventions

- Successful responses usually return JSON payloads or `{ "message": "..." }`
- Validation failures return `400`
- Missing/invalid auth returns `401`
- Not found resources return `404`
- Controllers forward errors to a central error handler for consistent formatting

## Core Route Groups

### Auth

Public:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/refresh`

Authenticated:

- `POST /auth/logout`
- `GET /auth/profile`
- `PUT /auth/profile`
- `PUT /auth/change-password`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/enable`
- `POST /auth/2fa/disable`
- `DELETE /auth/delete-account`

Example login request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "twoFactorCode": "123456"
}
```

Example login response body:

```json
{
  "message": "Login successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Alice",
    "twoFactorEnabled": true,
    "salt": "base64-salt"
  }
}
```

### Vault

Authenticated:

- `POST /vault/entries`
- `GET /vault/entries`
- `GET /vault/entries/:id`
- `PUT /vault/entries/:id`
- `DELETE /vault/entries/:id`
- `GET /vault/export`
- `POST /vault/import`

Public:

- `GET /vault/successor-access?token=...`

Notes:

- Vault entry payloads are already encrypted on the client.
- Export/import moves encrypted vault material, not plaintext secrets.
- Import supports `merge` and `replace` modes.

Example import request:

```json
{
  "mode": "merge",
  "entries": [
    {
      "id": "entry-id",
      "encryptedData": "base64-ciphertext",
      "iv": "base64-iv",
      "salt": "base64-salt",
      "algorithm": "AES-GCM",
      "category": "documents",
      "tags": ["finance"]
    }
  ]
}
```

### Activity And Check-In

Authenticated:

- `GET /activity`
- `POST /activity/check-in`

Public:

- `GET /activity/check-in-link?token=...`
- `POST /activity/check-in-link`

These routes drive audit log views, manual check-ins, and secure emailed check-in links.

### Inactivity Settings

Authenticated:

- `GET /inactivity/settings`
- `PUT /inactivity/settings`
- `POST /inactivity/pause`
- `POST /inactivity/resume`

Settings control threshold days, pause state, notification methods, and handover behavior.

### Sessions

Authenticated:

- `GET /sessions`
- `DELETE /sessions/:sessionId`
- `POST /sessions/invalidate-others`

These endpoints back the web UI session-management page.

### Successors

Public:

- `GET /successors/verify?token=...`

Authenticated:

- `PUT /successors/shares`
- `POST /successors`
- `GET /successors`
- `GET /successors/:id`
- `PUT /successors/:id`
- `DELETE /successors/:id`
- `POST /successors/:id/resend-verification`
- `POST /successors/:id/verify`
- `GET /successors/:id/assigned-entries`
- `PUT /successors/:id/assigned-entries`

The assigned-entry routes allow the owner to restrict a successor to specific vault entries.

### Admin

Authenticated admin-only:

- `GET /admin/dashboard`
- `GET /admin/users`
- `POST /admin/users/:userId/unlock`
- `GET /admin/users/:userId/lockout-status`

Admin access is currently enforced via an `ADMIN_EMAILS` allowlist.

### Contact

Public:

- `POST /contact`

Used by the public contact form.

### Operational Endpoints

Public:

- `GET /health`
- `GET /metrics`

`/health` includes database, Redis, queue, job-manager, and realtime status data.

## Realtime

The API exposes an authenticated WebSocket endpoint at:

- `ws://localhost:3001/ws` (local)
- `wss://api.handoverkey.com/ws` (production example)

Browser clients usually connect via:

- `VITE_WS_URL`, if configured
- otherwise the current host's `/ws` endpoint

Current user-targeted events include reminder notifications and handover status changes.

## Environment Notes

Important API deployment variables include:

- `JWT_SECRET`
- `ACTIVITY_HMAC_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `ADMIN_EMAILS`
- `SMTP_*`

See:

- `apps/api/.env.example`
- `docs/deployment.md`

## Source Of Truth

For shipped behavior, prefer:

- route files in `apps/api/src/routes/`
- validation schemas in `apps/api/src/validation/schemas/`
- `CHANGELOG.md` for release-level feature changes

---

**Last Updated**: 2026-03-18
**Version**: 2.0.0
