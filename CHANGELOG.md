# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-18

### Security

- **End-to-end TOTP 2FA**: Added full two-factor setup, enable/disable, challenge verification, and recovery code flows across API and web app
- **Recovery code support**: Added persistence and service logic for one-time recovery codes, including schema/type updates
- **Check-in hardening**: Added secure public check-in link validation/execution with token-based flow and improved activity safeguards
- **Operational auth tightening**: Expanded authenticated profile/password/session pathways and aligned route validation with stricter request schemas

### Added

- **Realtime notifications**:
  - Backend WebSocket service with authenticated, user-scoped broadcasts (`/ws`)
  - Frontend realtime client with reconnect handling and auth lifecycle integration
  - UI toast surfacing for reminder and handover status events
- **Admin operations surface**:
  - `GET /api/v1/admin/dashboard` for platform-level operational metrics
  - `GET /api/v1/admin/users` for admin user lookup/search
  - Expanded lockout/unlock admin workflows
  - New `/admin` dashboard UI
- **Audit and activity UX**:
  - New `/activity` page for activity trail visibility
  - Expanded activity APIs and check-in capabilities
- **Vault portability**:
  - `GET /api/v1/vault/export` for encrypted vault backup export
  - `POST /api/v1/vault/import` for encrypted vault restore/import (`merge`/`replace`)
- **Successor assignment controls**:
  - Added per-successor vault entry assignment APIs
  - Added `successor_vault_entries` repository and service/controller wiring
  - Added UI for assigning/restricting successor access to specific entries
- **Email template system**:
  - Added HTML templates for inactivity reminders, handover alerts, and cancellation notices
  - Added server-side template rendering support in email services
- **Repository integration coverage**:
  - New comprehensive database integration suite: `packages/database/src/__tests__/repositories.integration.test.ts`
  - New shared `VaultManager` tests: `packages/shared/src/crypto/vault.test.ts`

### Changed

- **Handover orchestration**: Consolidated critical handover lifecycle behavior through orchestrator-backed service flows and improved status transitions
- **Successor access behavior**: Enforced optional `restrict_to_assigned_entries` semantics during successor vault access
- **Inactivity processing**: Improved activity-driven inactivity handling and check-in behavior for dead-man's-switch reliability
- **Notification delivery UX**: Migrated key outbound notifications from plain text content to HTML template-backed rendering
- **Frontend navigation and product surface**: Added routes and navigation for activity, admin, session, check-in, successor, and enhanced vault flows
- **Web dev proxying**: Added Vite WebSocket proxy support for local realtime development

### Testing

- Expanded API integration coverage for admin operations, auth/2FA, sessions/activity, and vault/successor behavior
- Expanded shared utility coverage for `validatePassword`, `sanitizeInput`, and `VaultManager`
- Added repository-level integration tests against migrated schema paths
- Stabilized flaky web auth integration timing with explicit test timeouts where needed

### Breaking Changes

- **Major semver bump**: Release version advanced from `1.x` to `2.0.0`
- **Migration requirement**: Deployments must apply new DB migrations before serving traffic
- **Realtime expectation**: Environments using live notifications must expose the `/ws` endpoint correctly
- **Stricter successor controls**: Successor vault visibility is narrowed when assignment restrictions are enabled

## [1.1.0] - 2026-03-16

### Security

- **httpOnly cookie auth**: Migrated JWT storage from localStorage to httpOnly cookies, eliminating XSS token theft vectors
- **Removed hardcoded JWT secret**: App now refuses to start without a proper `JWT_SECRET` env var
- **CORS origin allowlist**: Replaced `callback(null, true)` with explicit origin validation from `CORS_ORIGINS` env var
- **Admin role enforcement**: Admin routes now require `ADMIN_EMAILS` allowlist (was unauthenticated)
- **Environment validation**: Zod-based startup validation for all required env vars -- fails fast with clear error messages
- **Body parser limit**: Reduced from 50MB to 1MB to mitigate DoS vectors
- **Security doc rewrite**: Rewrote `docs/security.md` to accurately reflect implemented features vs roadmap

### Changed

- **Structured logging everywhere**: Migrated all 84+ `console.log/error/warn` calls across controllers, services, and middleware to Pino structured logger
- **Unified error handling**: All controllers now use `next(error)` consistently; error handler maps database `NotFoundError` to HTTP 404 and `DatabaseError` to HTTP 500
- **Activity system consolidation**: Merged `ActivityRepository` and `ActivityRecordsRepository` into a single repository with proper SHA-256 signatures (removed `"pending-implementation"` placeholder)
- **Grace period configuration**: Unified `HandoverService` (7 days) and `HandoverOrchestrator` (48 hours) to use a shared `GRACE_PERIOD_HOURS` env var
- **Server startup**: Fixed race condition where `app.listen()` ran before DB/Redis/Jobs were initialized

### Added

- **React Error Boundary**: Catches render crashes with a user-friendly fallback instead of white screen
- **Database package tests**: 17 unit tests for error hierarchy and `DatabaseClient` lifecycle
- **Pre-commit hooks**: Husky + lint-staged runs Prettier and ESLint on staged files before every commit
- **Cursor rules**: `.cursor/rules/handoverkey.mdc` codifies project conventions for AI-assisted development
- **Coverage in CI**: Crypto package coverage thresholds now enforced in the PR pipeline

### Removed

- Placeholder test files (`empty.test.ts`, `test-imports.test.ts`)
- 29 stale dependabot branches
- Duplicate `ActivityRecordsRepository` (consolidated into `ActivityRepository`)

### Fixed

- `/settings` route missing leading slash in `App.tsx`
- CONTRIBUTING.md referenced nonexistent `packages/core` and `packages/api`
- README.md referenced nonexistent root `env.example`
- Test badge was a static SVG; replaced with live CI badge

## [1.0.0] - 2025-11-19

### Added

- **Core Platform**
  - Zero-knowledge encryption architecture using Web Crypto API (AES-256-GCM)
  - Dead man's switch functionality with configurable inactivity periods
  - Multi-party handover using Shamir's Secret Sharing
  - Secure vault for storing passwords, documents, and notes

- **Frontend (`apps/web`)**
  - React 18 + Vite application
  - Dashboard for vault management
  - Settings for inactivity configuration
  - Responsive design with Tailwind CSS

- **Backend (`apps/api`)**
  - Node.js + Express REST API
  - PostgreSQL database with Kysely for type-safe queries
  - Redis integration for job queues (BullMQ) and caching
  - Structured logging (Pino) and Metrics (Prometheus)

- **Infrastructure**
  - Docker Compose setup for local development
  - GitHub Actions CI pipeline
  - Monorepo structure using Turborepo

- **Documentation**
  - Comprehensive Architecture Guide
  - Security Model documentation
  - API Reference
  - Deployment Guide
