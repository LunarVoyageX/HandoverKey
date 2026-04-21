# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0](https://github.com/LunarVoyageX/HandoverKey/compare/v1.1.3...v2.0.0) (2026-04-21)


### ⚠ BREAKING CHANGES

* release v2.0.0 enterprise completion ([#195](https://github.com/LunarVoyageX/HandoverKey/issues/195))

### Features

* add FAQ section, handover routes, and onboarding checklist ([#222](https://github.com/LunarVoyageX/HandoverKey/issues/222)) ([f94cbaf](https://github.com/LunarVoyageX/HandoverKey/commit/f94cbaf0abcddfc936752da83d9e8497c257ffe8))
* add user name support, account deletion, and ui improvements ([5c69433](https://github.com/LunarVoyageX/HandoverKey/commit/5c6943307756db355f2dd53861575818790835ce))
* completed web ui, added landing page and others ([bdf1d68](https://github.com/LunarVoyageX/HandoverKey/commit/bdf1d682d2f999208c9daeda0fe7dcdf90e3cc56))
* dead mans switch ([#15](https://github.com/LunarVoyageX/HandoverKey/issues/15)) ([6a300f6](https://github.com/LunarVoyageX/HandoverKey/commit/6a300f624bd4af1862ee4c68ad6862454216fe30))
* implement contract us ([7f63bac](https://github.com/LunarVoyageX/HandoverKey/commit/7f63bace0812a14fdbe619b22afc38baffbca353))
* Implement Dead Man's Switch functionality with inactivity settings, successor management, and session handling. ([77d7ff1](https://github.com/LunarVoyageX/HandoverKey/commit/77d7ff1f2a2c3d4502b2ffd75b8ea73ac9d3a1e9))
* implement email verification process during registration and login ([6caf57a](https://github.com/LunarVoyageX/HandoverKey/commit/6caf57a329d4a538f12fd04dea0063b856fe5499))
* improve ui design ([ed4ec57](https://github.com/LunarVoyageX/HandoverKey/commit/ed4ec579115cfb746bf78cab21e47d8cdeb5907e))
* improve vault design when no secrets are added ([6c0e636](https://github.com/LunarVoyageX/HandoverKey/commit/6c0e6360a360689a67256c212924f6cfd3fa4970))
* Phase 3 -- Frontend Polish ([#219](https://github.com/LunarVoyageX/HandoverKey/issues/219)) ([525afb5](https://github.com/LunarVoyageX/HandoverKey/commit/525afb57cabc0dcbe0dbbbd8f6a5a3d64c2ba164))
* Phase 5 -- Feature Completion ([#221](https://github.com/LunarVoyageX/HandoverKey/issues/221)) ([fe77950](https://github.com/LunarVoyageX/HandoverKey/commit/fe779507fa105e3b23bede13df09b8705876853a))
* release v2.0.0 enterprise completion ([#195](https://github.com/LunarVoyageX/HandoverKey/issues/195)) ([23866ff](https://github.com/LunarVoyageX/HandoverKey/commit/23866ffd15ebd9de72854ed3bc867350507cd6e0))
* user threshold configuration API endpoints ([#31](https://github.com/LunarVoyageX/HandoverKey/issues/31)) ([7eb1401](https://github.com/LunarVoyageX/HandoverKey/commit/7eb140189f386029c9c7b9fe4b122dee3260c597))
* v1.1.0 — security hardening, structured logging, httpOnly cookies, unified activity system ([7561bbf](https://github.com/LunarVoyageX/HandoverKey/commit/7561bbf10055b97a697d56b8b7a8791a71751591))
* vault management UI ([#32](https://github.com/LunarVoyageX/HandoverKey/issues/32)) ([0820b3a](https://github.com/LunarVoyageX/HandoverKey/commit/0820b3a2c610f7f27feaa11119a3d14d3c7db695))
* **vault:** implement Shamir's Secret Sharing distribution and successor access ([#127](https://github.com/LunarVoyageX/HandoverKey/issues/127)) ([e840b0b](https://github.com/LunarVoyageX/HandoverKey/commit/e840b0b7615b6986fb8819f750c8e964b5bf5904))


### Bug Fixes

* add db migration during api startup ([dea2190](https://github.com/LunarVoyageX/HandoverKey/commit/dea21906744947b1664f79604691d1b7f0e94d05))
* added build dependencies ([d2c293f](https://github.com/LunarVoyageX/HandoverKey/commit/d2c293f9d716e687b966a2c68dc01f7982455564))
* admin panel nav visibility, audit trail, and activity display ([#234](https://github.com/LunarVoyageX/HandoverKey/issues/234)) ([be2d43e](https://github.com/LunarVoyageX/HandoverKey/commit/be2d43ef1f27441180836a902512e63f6e9c6bff))
* api build issue ([5b69c38](https://github.com/LunarVoyageX/HandoverKey/commit/5b69c385fa92ebf1c5b26a80f9528797edc9a18d))
* auto-include www variant in CORS allowed origins ([#228](https://github.com/LunarVoyageX/HandoverKey/issues/228)) ([1e8b63c](https://github.com/LunarVoyageX/HandoverKey/commit/1e8b63c51600c2150a820d00cffcaaeb39cfbe1b))
* build failure ([#25](https://github.com/LunarVoyageX/HandoverKey/issues/25)) ([fd1acd3](https://github.com/LunarVoyageX/HandoverKey/commit/fd1acd39a0b079f357167c29ef8dc7d0b846af84))
* build issues ([2cbec59](https://github.com/LunarVoyageX/HandoverKey/commit/2cbec59ce5604a8216781f4504efafb2ead6f240))
* center README heading and harden security pipeline ([6b335d0](https://github.com/LunarVoyageX/HandoverKey/commit/6b335d0c11a3bdda5bd2cde0fbefd308281524b0))
* **ci:** pass JWT secrets through Turbo to test processes ([47aaa7a](https://github.com/LunarVoyageX/HandoverKey/commit/47aaa7a38c48a38a05f38574c48fba7e2050f83a))
* **ci:** remove custom CodeQL job that conflicts with default setup ([bab990b](https://github.com/LunarVoyageX/HandoverKey/commit/bab990b9179bbbbec75d867b767dd5d4f57790a7))
* consolidate env name ([1b9e495](https://github.com/LunarVoyageX/HandoverKey/commit/1b9e49507c021dfae1bc72b68547ee2d03d4f066))
* cors config ([79e85a8](https://github.com/LunarVoyageX/HandoverKey/commit/79e85a89a154e5be8dc9c99fd3c56a6b6d6dadaf))
* cors config ([f81fe17](https://github.com/LunarVoyageX/HandoverKey/commit/f81fe172bbe3a02b0753b6cb8383123955c22fe0))
* cors issue ([cc37a0d](https://github.com/LunarVoyageX/HandoverKey/commit/cc37a0dc202f3372e5fb8d4ddc742b600fcb486d))
* cors policy ([1bfca90](https://github.com/LunarVoyageX/HandoverKey/commit/1bfca9021caa556b56bc52c1d6fb18539265a957))
* critical security issues ([#16](https://github.com/LunarVoyageX/HandoverKey/issues/16)) ([43a254c](https://github.com/LunarVoyageX/HandoverKey/commit/43a254ce326c5b00a0f81b379c47bd326656f143))
* docker build ([f8b36ee](https://github.com/LunarVoyageX/HandoverKey/commit/f8b36ee39cd0ec0b809d12d7b0e6ef4dc65c5e56))
* docker build issue ([0622873](https://github.com/LunarVoyageX/HandoverKey/commit/062287373a9f64a24822112878cef37d4b016010))
* **docker:** prevent husky/devDep failures in production builds ([383ffb0](https://github.com/LunarVoyageX/HandoverKey/commit/383ffb05ad00bdce7433ecd7fd9539660b5dfd0c))
* enhance core implementation with missing components and tests ([#9](https://github.com/LunarVoyageX/HandoverKey/issues/9)) ([aa9a46d](https://github.com/LunarVoyageX/HandoverKey/commit/aa9a46d6ed86a31acbdea2c8e410c39b914dbb38))
* exclude release-please files from prettier checks ([#230](https://github.com/LunarVoyageX/HandoverKey/issues/230)) ([8542e88](https://github.com/LunarVoyageX/HandoverKey/commit/8542e88dc8830dd144d8fd9b68bd0cb3e6a5c36d))
* improve UX across auth, vault, and successor flows ([#223](https://github.com/LunarVoyageX/HandoverKey/issues/223)) ([bac8cb1](https://github.com/LunarVoyageX/HandoverKey/commit/bac8cb14216ed9daa8ca324c1910bae066a38c84))
* imrpove integration test stability ([156340c](https://github.com/LunarVoyageX/HandoverKey/commit/156340c61fc341ae931dbf37ba65c6df154d7bd4))
* linting issues ([b11b985](https://github.com/LunarVoyageX/HandoverKey/commit/b11b9851e78823652f9b6d4edad6146ba230374f))
* linting issues ([7ead233](https://github.com/LunarVoyageX/HandoverKey/commit/7ead23389d86739d13891d0d8bde100165efbc2a))
* linting issues ([d058d6f](https://github.com/LunarVoyageX/HandoverKey/commit/d058d6f2dc79cdddcd78b2671c7ccefed5b8960c))
* linting issues ([f9b5ba6](https://github.com/LunarVoyageX/HandoverKey/commit/f9b5ba6eef97124671a58505864d0c0020bd3c52))
* logger config ([cc4c798](https://github.com/LunarVoyageX/HandoverKey/commit/cc4c79847960e5c62eb33a4587db597d504a928c))
* missing email templates in prod deployment ([32bcaaf](https://github.com/LunarVoyageX/HandoverKey/commit/32bcaafbbdc249ae54a395e0714260f3e057429d))
* missing name while registering a user ([f33f608](https://github.com/LunarVoyageX/HandoverKey/commit/f33f60839523d981c2cd81e532a1874a770ab681))
* package build order ([#136](https://github.com/LunarVoyageX/HandoverKey/issues/136)) ([e7a776a](https://github.com/LunarVoyageX/HandoverKey/commit/e7a776ac86b79fdc030a5fb5902c81d4dec83472))
* package version ([0391710](https://github.com/LunarVoyageX/HandoverKey/commit/03917101611caf63a82ce8c114ff8a0e57181bcb))
* Phase 1 -- Security Hardening ([#217](https://github.com/LunarVoyageX/HandoverKey/issues/217)) ([10a922e](https://github.com/LunarVoyageX/HandoverKey/commit/10a922e02569caeb97f687b1cb4846bbda41a477))
* relaxed performance tests ([#23](https://github.com/LunarVoyageX/HandoverKey/issues/23)) ([b0dc515](https://github.com/LunarVoyageX/HandoverKey/commit/b0dc515e12e9511af4fb772748babe491beb4890))
* relaxed time limit for tests ([#24](https://github.com/LunarVoyageX/HandoverKey/issues/24)) ([52b2002](https://github.com/LunarVoyageX/HandoverKey/commit/52b2002b4fa008ad33f4c9a23b9491f6c440452a))
* resolve all Dependabot security vulnerabilities ([#226](https://github.com/LunarVoyageX/HandoverKey/issues/226)) ([e12c7e6](https://github.com/LunarVoyageX/HandoverKey/commit/e12c7e681ffbf3678bc72b062e92bd5212ff0d16))
* resolve Redis initialization race condition on startup ([#232](https://github.com/LunarVoyageX/HandoverKey/issues/232)) ([962cb7b](https://github.com/LunarVoyageX/HandoverKey/commit/962cb7b7230c07d17dc2daa91199e255c71b405b))
* security issues, revamped UI, added new functionalities ([#96](https://github.com/LunarVoyageX/HandoverKey/issues/96)) ([ba94b88](https://github.com/LunarVoyageX/HandoverKey/commit/ba94b888b7d3a70bda0c89247aa1148891295ee3))
* **test:** prevent vault modal test timeout in CI ([09dfcb4](https://github.com/LunarVoyageX/HandoverKey/commit/09dfcb4aed72be8c226615b688b2cf58d3e53f78))
* tests ([954436b](https://github.com/LunarVoyageX/HandoverKey/commit/954436b738aaa569b5f461ec74a5735f42258173))
* ui redirect issue ([#196](https://github.com/LunarVoyageX/HandoverKey/issues/196)) ([a9428d6](https://github.com/LunarVoyageX/HandoverKey/commit/a9428d6bb2fb9f1c414c7c1cba59a486112b63e8))
* updated docker configs ([a213f13](https://github.com/LunarVoyageX/HandoverKey/commit/a213f1362ad307e5dc1b5ad2fc98dc8e3bd336cd))
* use SameSite=None for cross-origin cookie auth in production ([5f60281](https://github.com/LunarVoyageX/HandoverKey/commit/5f60281cb269b876dadd14b749f4bdcb6b52acd8))

## [1.1.3](https://github.com/HandoverKey/HandoverKey/compare/v1.1.2...v1.1.3) (2026-04-20)


### Bug Fixes

* admin panel nav visibility, audit trail, and activity display ([#234](https://github.com/HandoverKey/HandoverKey/issues/234)) ([be2d43e](https://github.com/HandoverKey/HandoverKey/commit/be2d43ef1f27441180836a902512e63f6e9c6bff))
* resolve Redis initialization race condition on startup ([#232](https://github.com/HandoverKey/HandoverKey/issues/232)) ([962cb7b](https://github.com/HandoverKey/HandoverKey/commit/962cb7b7230c07d17dc2daa91199e255c71b405b))

## [1.1.2](https://github.com/HandoverKey/HandoverKey/compare/v1.1.1...v1.1.2) (2026-04-20)


### Bug Fixes

* exclude release-please files from prettier checks ([#230](https://github.com/HandoverKey/HandoverKey/issues/230)) ([8542e88](https://github.com/HandoverKey/HandoverKey/commit/8542e88dc8830dd144d8fd9b68bd0cb3e6a5c36d))

## [1.1.1](https://github.com/HandoverKey/HandoverKey/compare/v1.1.0...v1.1.1) (2026-04-20)


### Bug Fixes

* auto-include www variant in CORS allowed origins ([#228](https://github.com/HandoverKey/HandoverKey/issues/228)) ([1e8b63c](https://github.com/HandoverKey/HandoverKey/commit/1e8b63c51600c2150a820d00cffcaaeb39cfbe1b))

## [1.1.0](https://github.com/HandoverKey/HandoverKey/compare/v1.0.0...v1.1.0) (2026-04-20)

### Features

- add FAQ section, handover routes, and onboarding checklist ([#222](https://github.com/HandoverKey/HandoverKey/issues/222)) ([f94cbaf](https://github.com/HandoverKey/HandoverKey/commit/f94cbaf0abcddfc936752da83d9e8497c257ffe8))

### Bug Fixes

- improve UX across auth, vault, and successor flows ([#223](https://github.com/HandoverKey/HandoverKey/issues/223)) ([bac8cb1](https://github.com/HandoverKey/HandoverKey/commit/bac8cb14216ed9daa8ca324c1910bae066a38c84))
- resolve all Dependabot security vulnerabilities ([#226](https://github.com/HandoverKey/HandoverKey/issues/226)) ([e12c7e6](https://github.com/HandoverKey/HandoverKey/commit/e12c7e681ffbf3678bc72b062e92bd5212ff0d16))

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
