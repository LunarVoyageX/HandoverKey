# HandoverKey API

Express 5 + TypeScript API for the HandoverKey platform.

## What This App Does

- serves the `/api/v1/*` REST API
- authenticates users with JWT-backed sessions
- manages encrypted vault data and portability flows
- orchestrates inactivity, reminders, grace periods, and handover
- exposes admin, contact, activity, and session-management endpoints
- serves realtime notifications over `/ws`

## Main Route Groups

- `/api/v1/auth`
- `/api/v1/vault`
- `/api/v1/activity`
- `/api/v1/inactivity`
- `/api/v1/sessions`
- `/api/v1/successors`
- `/api/v1/admin`
- `/api/v1/contact`
- `/health`
- `/metrics`

See `../../docs/api.md` for the maintained external API reference.

## Local Development

From the repo root:

```bash
cp apps/api/.env.example apps/api/.env
npm install
npm run docker:up
npm run db:migrate
npm run build
npm run dev -w @handoverkey/api
```

Default local URL:

- `http://localhost:3001`

## Environment

Important variables:

```bash
API_PORT=3001
JWT_SECRET=
ACTIVITY_HMAC_SECRET=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=handoverkey_dev
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

Additional optional configuration includes:

- `ADMIN_EMAILS`
- `SMTP_*`
- `COOKIE_DOMAIN`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `TWO_FACTOR_ISSUER`
- `GRACE_PERIOD_HOURS`

See `.env.example` and `../../docs/deployment.md`.

## Security Notes

- browser auth uses httpOnly cookies
- bearer auth is also supported for API clients
- TOTP 2FA and recovery codes are implemented
- account lockout, request validation, and sanitization are enabled
- activity records are HMAC-signed for integrity checks

See `../../docs/security.md` for the full security model.

## Quality Commands

```bash
npm run lint -w @handoverkey/api
npm run test -w @handoverkey/api
npm run build -w @handoverkey/api
```

## Production Notes

- use Node.js 22+
- run with PostgreSQL and Redis available
- ensure `/ws` upgrade requests are forwarded by your proxy/load balancer
- monitor `/health` and `/metrics`

The repository includes `apps/api/Dockerfile` and root-level compose files as starting
points.
