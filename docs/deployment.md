# HandoverKey Deployment Guide

This guide documents the deployment options that match the current repository.

## Supported Deployment Shapes

HandoverKey currently supports two practical deployment patterns:

1. **Local development** with Node.js plus Docker for PostgreSQL and Redis
2. **Hosted/container deployment** with:
   - a static or Node-served frontend
   - a Node.js API service
   - PostgreSQL
   - Redis
   - SMTP

The repository includes:

- `docker-compose.yml`
- `docker-compose.prod.yaml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/web/vercel.json`

## Required Services

### API runtime

- Node.js 22+
- PostgreSQL
- Redis
- optional SMTP provider for transactional emails

### Web runtime

- static host or container capable of serving the Vite build
- SPA rewrite support so client-side routes resolve to `index.html`

## Local Development

```bash
git clone https://github.com/HandoverKey/HandoverKey.git
cd HandoverKey
npm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run docker:up
npm run db:migrate
npm run build
npm run dev
```

Local endpoints:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- API base: `http://localhost:3001/api/v1`
- WebSocket: `ws://localhost:3001/ws`

## Containerized Deployment

### Development-oriented compose

`docker-compose.yml` is intended for a full local stack:

- PostgreSQL 16
- Redis 7
- API container
- web container

Typical flow:

```bash
docker compose up --build
```

If you use the containerized web app instead of Vite, the frontend is served from
`http://localhost:3000`.

### Production-oriented compose

`docker-compose.prod.yaml` is a starting point for self-hosted deployments. You still
need to provide real production secrets, a managed PostgreSQL instance or an external
database service, SMTP credentials, TLS termination, and persistent backup strategy.

Example:

```bash
docker compose -f docker-compose.prod.yaml --env-file .env up --build -d
```

## Environment Variables

### API

The current API contract is driven by `apps/api/.env.example` and runtime usage in
`apps/api/src`.

Commonly required variables:

```bash
JWT_SECRET=
ACTIVITY_HMAC_SECRET=
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
REDIS_HOST=
REDIS_PORT=6379
FRONTEND_URL=
CORS_ORIGINS=
```

Common optional variables:

```bash
API_PORT=3001
REDIS_PASSWORD=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_DOMAIN=
ADMIN_EMAILS=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
TWO_FACTOR_ISSUER=HandoverKey
GRACE_PERIOD_HOURS=48
```

Notes:

- `JWT_SECRET` and `ACTIVITY_HMAC_SECRET` should both be long random secrets.
- `FRONTEND_URL` and `CORS_ORIGINS` must match the actual web origin(s).
- `ADMIN_EMAILS` is a comma-separated allowlist for admin routes.
- SMTP is strongly recommended for email verification, reminders, successor workflows,
  password resets, and contact forms.

### Web

The web app uses build-time Vite variables from `apps/web/.env.example`.

```bash
VITE_API_URL=
VITE_WS_URL=
```

Typical values:

- local with Vite proxy: leave `VITE_API_URL` empty
- hosted split frontend/API:
  - `VITE_API_URL=https://api.handoverkey.com/api/v1`
  - `VITE_WS_URL=wss://api.handoverkey.com/ws`

## Frontend Hosting Notes

### SPA rewrites

Any frontend host must rewrite non-asset routes to `index.html`. Without that, direct
navigation to client-side routes such as `/login` will return 404 responses.

The repository includes a Vercel-specific configuration in `apps/web/vercel.json`.

### Cookie and CORS alignment

If the web app and API run on different origins:

- enable TLS everywhere
- set `FRONTEND_URL`
- set `CORS_ORIGINS`
- keep browser cookie settings consistent with secure cross-site usage

## Backend Hosting Notes

### Health and monitoring

Expose and monitor:

- `GET /health`
- `GET /metrics`
- application logs
- Redis and PostgreSQL health

### WebSocket routing

Reverse proxies or load balancers must forward upgrade requests for `/ws`.

### Database migrations

Run migrations before or during startup. The production API start command runs the
migration bundle before launching the server.

## Recommended Production Checklist

- TLS enabled for both web and API origins
- PostgreSQL backups and restore plan tested
- Redis persistence or managed Redis configured appropriately
- strong `JWT_SECRET` and `ACTIVITY_HMAC_SECRET`
- SMTP credentials configured
- `FRONTEND_URL` and `CORS_ORIGINS` verified
- `VITE_API_URL` and `VITE_WS_URL` verified
- `/health` and `/metrics` integrated with monitoring
- SPA rewrites confirmed on the web host

## What This Guide Does Not Assume

This repository does not currently include:

- Kubernetes manifests
- Helm charts
- Terraform modules
- cloud-vendor-specific deployment automation

You can deploy HandoverKey to those environments, but the documentation above focuses on
what the repository actually ships today.

---

**Last Updated**: 2026-03-18
**Version**: 2.0.0
