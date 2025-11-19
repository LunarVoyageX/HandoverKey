# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
