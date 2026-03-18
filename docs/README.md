# Documentation Index

This folder contains the maintained technical and operational documentation for
HandoverKey `v2.0.0`.

## Start Here

- [`../README.md`](../README.md): project overview, quick start, and contributor links
- [`api.md`](api.md): current HTTP API and authentication model
- [`architecture.md`](architecture.md): runtime topology, package boundaries, and data flow
- [`deployment.md`](deployment.md): local development, containerized deployment, and hosted setup guidance
- [`security.md`](security.md): implemented security model, controls, and limitations
- [`testing.md`](testing.md): test strategy, commands, and workspace-level expectations

## How To Use These Docs

- Treat the route files in `apps/api/src/routes/` and the changelog as the source of truth
  for shipped behavior.
- If you change an endpoint, auth behavior, deployment requirement, or environment
  variable, update the matching document in this directory in the same pull request.
- If something is not implemented yet, label it as roadmap or future work instead of
  documenting it as an active feature.

## Documentation Scope

These docs describe the system that is currently in this repository:

- React 19 SPA in `apps/web`
- Express 5 API in `apps/api`
- PostgreSQL + Kysely data layer
- Redis-backed sessions, lockout state, and job queues
- WebSocket realtime notifications
- Shared crypto, database, and utility packages
