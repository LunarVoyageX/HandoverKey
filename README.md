<div align="center">

# HandoverKey

Open-source zero-knowledge digital legacy platform and dead man's switch.

[![CI](https://github.com/HandoverKey/HandoverKey/actions/workflows/ci.yml/badge.svg)](https://github.com/HandoverKey/HandoverKey/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/HandoverKey/HandoverKey)](https://github.com/HandoverKey/HandoverKey/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Security Policy](https://img.shields.io/badge/security-policy-blueviolet.svg)](SECURITY.md)

[Features](#key-features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## About

HandoverKey helps users protect and eventually transfer access to critical digital
information without giving the service provider access to plaintext vault data.

The platform works as a dead man's switch:

1. A user stores encrypted secrets in the vault.
2. The user configures inactivity settings and trusted successors.
3. If the user fails to check in, the system sends reminders and enters a grace period.
4. Once the handover flow is triggered, verified successors can access only the data
   the user has made available to them.

## Project Status

`v1.0.0` is the current release.

The repository now ships a production-grade web app and API with:

- client-side encrypted vault storage
- TOTP 2FA with recovery codes and password strength enforcement
- secure session management with httpOnly cookies
- activity logs and secure check-in links
- vault import/export
- successor verification, per-entry access restrictions, and key share generation
- handover orchestration with HTTP endpoints for status, cancellation, and successor response
- guided onboarding checklist for new users
- interactive FAQ covering zero-knowledge security and handover mechanics
- realtime WebSocket notifications
- role-based admin dashboard and operational APIs

Roadmap items such as mobile clients, passkeys, and broader multi-platform support
remain future work.

## Key Features

- **Zero-knowledge vault storage**: secrets are encrypted client-side with AES-256-GCM
  before they are sent to the API.
- **Dead man's switch orchestration**: configurable inactivity thresholds, reminders,
  grace period handling, and manual/public check-in flows.
- **Handover API**: dedicated endpoints for handover status, cancellation, and
  public successor accept/decline with rate limiting and Zod validation.
- **Successor controls**: verified successors, Shamir's Secret Sharing key
  distribution with threshold enforcement, and optional per-successor vault entry
  restrictions.
- **Strong account security**: httpOnly cookie auth, server-side session validation,
  TOTP 2FA with collapsible login UI, recovery codes, password strength enforcement,
  lockout protection, and request validation.
- **Guided onboarding**: first-time users see a checklist tracking vault setup,
  successor designation, key share generation, and inactivity configuration.
- **Operational visibility**: role-gated admin dashboard, activity logs, health
  checks, background job monitoring, and structured logging.
- **Realtime UX**: WebSocket-based user notifications for reminders and handover
  state changes.
- **Portable data**: encrypted vault export/import to support backup and migration.
- **Accessible UI**: consistent component library, ARIA-compliant tooltips,
  keyboard-navigable controls, and formatted successor vault views.

## Architecture

HandoverKey is a Turbo monorepo with two deployable apps and three shared packages.

```mermaid
graph TD
    Browser["React SPA (apps/web)"] -->|HTTPS + Cookies| API["Express API (apps/api)"]
    Browser -->|WSS| WS["Realtime /ws"]
    API -->|SQL| DB[("PostgreSQL")]
    API -->|Queues / Sessions / Lockout| Redis[("Redis")]
    API -->|Email| SMTP["SMTP Provider"]
    API -->|Shared code| Packages["packages/crypto, packages/database, packages/shared"]
```

### Repository Layout

```text
apps/
  api/   Express 5 API -- controllers, routes, services, validation, jobs
  web/   React 19 SPA -- pages, components, contexts, services (Vite + Tailwind)
packages/
  crypto/    AES-256-GCM, PBKDF2, Shamir's Secret Sharing (Web Crypto API)
  database/  Kysely client, repository layer, schema types (PostgreSQL)
  shared/    Cross-package types, constants, validation helpers
docs/
  API, architecture, deployment, security, testing
```

See [`docs/architecture.md`](docs/architecture.md) for the detailed runtime model.

## Quick Start

### Prerequisites

- Node.js 22+
- npm 9+
- Docker (for PostgreSQL and Redis in local development)

### Local setup

```bash
git clone https://github.com/HandoverKey/HandoverKey.git
cd HandoverKey
npm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Generate strong secrets for the API env file.
# Example:
# JWT_SECRET=$(openssl rand -base64 48)
# ACTIVITY_HMAC_SECRET=$(openssl rand -base64 48)

npm run docker:up
npm run db:migrate
npm run build
npm run dev
```

Default local URLs:

- Web app: `http://localhost:5173`
- API: `http://localhost:3001`
- API base path: `http://localhost:3001/api/v1`

## Testing And Quality

```bash
npm run lint
npm run test
npm run build
```

Test tooling by workspace:

- `apps/web`: Vitest + Testing Library (component, integration, and UX flow tests)
- `apps/api`: Jest integration tests against PostgreSQL + Redis (auth, vault, successors, handover routes)
- `packages/crypto`: Jest with 80% coverage threshold
- `packages/database`: Jest repository/client tests
- `packages/shared`: Jest utility tests

Pre-commit hooks run Prettier and ESLint on staged files.

## Documentation

- [`docs/README.md`](docs/README.md): docs index and reading guide
- [`docs/api.md`](docs/api.md): current API contract and auth model
- [`docs/architecture.md`](docs/architecture.md): runtime topology and package boundaries
- [`docs/deployment.md`](docs/deployment.md): local, container, and hosted deployment notes
- [`docs/security.md`](docs/security.md): implemented security model and limitations
- [`docs/testing.md`](docs/testing.md): test workflows and coverage expectations
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution workflow and quality bar

## Security

Security issues should not be reported through public GitHub issues.

Please read [`SECURITY.md`](SECURITY.md) and report vulnerabilities to
`security@handoverkey.com`.

## Contributing

Contributions are welcome, including bug fixes, docs updates, tests, and new features.

Before opening a pull request:

1. Make your change on a branch created from `main`.
2. Add or update tests for behavior changes.
3. Update docs if the API, UI, or deployment contract changed.
4. Run `npm run lint && npm run test && npm run build`.

Full guidance lives in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Troubleshooting

| Problem                                              | Suggested fix                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| Docker services fail to start                        | Check Docker Desktop / daemon status and rerun `npm run docker:up`  |
| API fails during startup validation                  | Verify `JWT_SECRET`, `ACTIVITY_HMAC_SECRET`, DB, and Redis env vars |
| Web app cannot talk to API in production             | Set `VITE_API_URL` and `VITE_WS_URL` explicitly                     |
| Guest visits redirect strangely on hosted SPA routes | Ensure SPA rewrites are configured (see `apps/web/vercel.json`)     |

## Roadmap

- Mobile applications
- Passkeys / WebAuthn
- Broader multi-language support
- Additional operator tooling and deployment automation

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE).
