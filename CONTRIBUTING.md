# Contributing To HandoverKey

Thanks for contributing. Bug reports, tests, docs fixes, design feedback, and code
contributions are all welcome.

## Code Of Conduct

By participating in this project, you agree to follow the
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Before You Open An Issue

- search existing issues first
- use the provided issue templates when they fit
- report security vulnerabilities privately through [`SECURITY.md`](SECURITY.md)

Project issues live at:

- <https://github.com/HandoverKey/HandoverKey/issues>

## Ways To Contribute

### Report Bugs

Please include:

- a clear description of the problem
- reproduction steps
- expected vs actual behavior
- screenshots, logs, or error output when relevant
- your OS, browser, and app version if the issue is user-facing

### Suggest Enhancements

High-quality feature requests explain:

- the user or operator problem
- the proposed behavior
- why the change matters
- alternative approaches already considered

### Pick Up Existing Work

If you want a first contribution, look for issues tagged `good first issue` or
documentation/testing improvements.

## Development Setup

### Prerequisites

- Node.js 22+
- npm 9+
- Docker

### Bootstrap

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

Default local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## Project Structure

```text
apps/
  api/   Express 5 REST API
  web/   React 19 SPA
packages/
  crypto/    crypto primitives and helpers
  database/  Kysely client and repositories
  shared/    shared types and validation helpers
docs/
  API, architecture, deployment, testing, security
```

## Quality Bar

Every pull request should keep the repository healthy for the next contributor.

Before opening a PR, run:

```bash
npm run lint
npm run test
npm run build
```

Expected testing/tools by workspace:

- `apps/web`: Vitest
- `apps/api`: Jest
- `packages/crypto`: Jest with coverage thresholds
- `packages/database`: Jest
- `packages/shared`: Jest

## Pull Request Guidelines

1. Start from `main`.
2. Keep the scope focused.
3. Add or update tests for behavior changes.
4. Update docs when the API, UI, env contract, or deployment flow changes.
5. Use conventional commit prefixes where possible:
   - `feat:`
   - `fix:`
   - `docs:`
   - `refactor:`
   - `test:`
   - `build:`
6. Make sure CI is green before asking for review.

## Coding Conventions

- Follow the existing TypeScript, ESLint, and Prettier setup.
- Prefer small, reviewable changes over large mixed refactors.
- Keep dependency directions between apps/packages intact.
- Do not commit secrets, credentials, or `.env` files.

## Documentation Expectations

If your change affects any of the following, update the matching docs in the same PR:

- API routes or auth behavior
- environment variables
- deployment requirements
- security guarantees or limitations
- user-facing flows

Start with `docs/README.md` if you are not sure where an update belongs.

## Security Reporting

Do not open public GitHub issues for vulnerabilities.

Please follow [`SECURITY.md`](SECURITY.md) and report them privately to
`security@handoverkey.com`.

## License

By contributing, you agree that your contributions will be licensed under the MIT
license used by this repository.
