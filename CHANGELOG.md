# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/HandoverKey/HandoverKey/compare/v1.0.0...v1.1.0) (2026-04-20)


### Features

* add FAQ section, handover routes, and onboarding checklist ([#222](https://github.com/HandoverKey/HandoverKey/issues/222)) ([f94cbaf](https://github.com/HandoverKey/HandoverKey/commit/f94cbaf0abcddfc936752da83d9e8497c257ffe8))


### Bug Fixes

* improve UX across auth, vault, and successor flows ([#223](https://github.com/HandoverKey/HandoverKey/issues/223)) ([bac8cb1](https://github.com/HandoverKey/HandoverKey/commit/bac8cb14216ed9daa8ca324c1910bae066a38c84))
* resolve all Dependabot security vulnerabilities ([#226](https://github.com/HandoverKey/HandoverKey/issues/226)) ([e12c7e6](https://github.com/HandoverKey/HandoverKey/commit/e12c7e681ffbf3678bc72b062e92bd5212ff0d16))

## [1.0.0] - 2026-04-20

### Added

- **Core Platform**
  - Zero-knowledge encryption architecture using Web Crypto API (AES-256-GCM)
  - Dead man's switch functionality with configurable inactivity periods
  - Multi-party handover using Shamir's Secret Sharing
  - Secure vault for storing passwords, documents, and notes

- **Frontend (`apps/web`)**
  - React 19 + Vite SPA with Tailwind CSS
  - Dashboard, vault management, activity logs, and settings pages
  - Successor assignment UI with per-entry access controls
  - Admin dashboard for platform-level operational metrics
  - Route-level code splitting with React.lazy
  - SEO meta tags and conditional Vercel Analytics

- **Backend (`apps/api`)**
  - Express 5 REST API with Node.js 22
  - PostgreSQL 16 with Kysely for type-safe queries
  - Redis 7 integration for job queues (BullMQ) and rate limiting
  - Structured logging (Pino) and Prometheus metrics
  - End-to-end TOTP 2FA with recovery codes
  - Vault export/import for encrypted backup portability
  - Realtime WebSocket notifications with authenticated user-scoped broadcasts
  - Handover orchestration with successor response processing
  - Redis-backed rate limiting in production via rate-limit-redis
  - OpenAPI 3.1 specification (`docs/openapi.yaml`)

- **Security**
  - httpOnly cookie-based JWT authentication
  - CORS origin allowlist enforcement
  - Zod-based environment variable validation at startup
  - Input sanitization with prototype pollution protection
  - Helmet.js security headers
  - Admin role enforcement via email allowlist
  - Secure public check-in link validation

- **Infrastructure**
  - Turborepo monorepo with npm workspaces
  - Docker Compose setup for local development and production
  - GitHub Actions CI/CD pipeline (lint, build, test, Docker, release)
  - Husky + lint-staged + commitlint for commit quality
  - Dependabot for automated dependency updates

- **Testing**
  - API integration tests against real PostgreSQL + Redis
  - Frontend tests with Vitest and @testing-library/react
  - Crypto package with 80% coverage threshold
  - Database package unit tests

- **Documentation**
  - Architecture guide, security model, API reference, deployment guide
  - HTML email templates for notifications
