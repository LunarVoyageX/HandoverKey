# HandoverKey Web App

React 19 + Vite single-page application for HandoverKey.

## What This App Does

- registration, login, password reset, and email verification flows
- vault management with client-side encryption
- inactivity settings, manual check-in, and activity history
- successor management and assigned-entry controls
- session management and profile/security settings
- realtime notifications and admin dashboard UX
- public routes for successor access and secure check-in links

## Local Development

From the repo root:

```bash
cp apps/web/.env.example apps/web/.env
npm install
npm run dev -w @handoverkey/web
```

Default local URL:

- `http://localhost:5173`

## Environment

```bash
# Leave empty in local dev to use the Vite proxy.
VITE_API_URL=

# Optional explicit websocket URL for hosted deployments.
VITE_WS_URL=
```

Hosted example:

```bash
VITE_API_URL=https://api.handoverkey.com/api/v1
VITE_WS_URL=wss://api.handoverkey.com/ws
```

## Build And Test

```bash
npm run lint -w @handoverkey/web
npm run test -w @handoverkey/web
npm run build -w @handoverkey/web
```

## Deployment Notes

- the build output is a standard Vite SPA
- client-side routes need an `index.html` fallback
- `apps/web/vercel.json` provides the rewrite rule needed for Vercel

See `../../docs/deployment.md` and `../../docs/api.md` for the deployment and API
contracts the frontend expects.
