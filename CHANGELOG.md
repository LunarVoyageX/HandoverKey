# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
