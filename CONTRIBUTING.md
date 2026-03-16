# Contributing to HandoverKey

We welcome contributions to the HandoverKey project! Whether it's a bug report, a new feature, or an improvement to the documentation, your help is greatly appreciated.

Please take a moment to review this document to ensure a smooth and effective contribution process.

## Table of Contents

1.  [Code of Conduct](#1-code-of-conduct)
2.  [How to Contribute](#2-how-to-contribute)
    - [Reporting Bugs](#21-reporting-bugs)
    - [Suggesting Enhancements](#22-suggesting-enhancements)
    - [Your First Code Contribution](#23-your-first-code-contribution)
    - [Pull Request Guidelines](#24-pull-request-guidelines)
3.  [Development Setup](#3-development-setup)
    - [Prerequisites](#31-prerequisites)
    - [Getting Started](#32-getting-started)
    - [Running Tests](#33-running-tests)
    - [Code Style](#34-code-style)
4.  [Project Structure](#4-project-structure)
5.  [Security Policy](#5-security-policy)
6.  [License](#6-license)

## 1. Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## 2. How to Contribute

### 2.1 Reporting Bugs

If you find a bug, please open an issue on our [GitHub Issues](https://github.com/mahiuddinalkamal/handoverkey/issues). Before opening a new issue, please check if a similar issue already exists.

When reporting a bug, please include:

- A clear and concise description of the bug.
- Steps to reproduce the behavior.
- Expected behavior.
- Screenshots or error messages (if applicable).
- Your operating system, browser, and HandoverKey version.

### 2.2 Suggesting Enhancements

We welcome suggestions for new features or improvements. Please open an issue on our [GitHub Issues](https://github.com/mahiuddinalkamal/handoverkey/issues) and describe your idea.

When suggesting an enhancement, please include:

- A clear and concise description of the proposed enhancement.
- Why this enhancement would be useful.
- Any potential alternatives or considerations.

### 2.3 Your First Code Contribution

If you're looking to make your first contribution, look for issues labeled `good first issue` on our [GitHub Issues](https://github.com/mahiuddinalkamal/handoverkey/issues). These issues are specifically designed for new contributors.

### 2.4 Pull Request Guidelines

1.  **Fork the repository** and clone it to your local machine.
2.  **Create a new branch** from `main` for your changes: `git checkout -b feature/your-feature-name` or `bugfix/your-bug-name`.
3.  **Make your changes**. Ensure your code adheres to the existing code style.
4.  **Write tests** for your changes. Ensure all existing tests pass and your new tests cover the added functionality or bug fix.
5.  **Update documentation** if your changes affect any user-facing features or API endpoints.
6.  **Commit your changes** with a clear and concise commit message. Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) if possible (e.g., `feat: add user registration`, `fix: resolve login bug`).
7.  **Push your branch** to your forked repository.
8.  **Open a Pull Request** to the `main` branch of the original repository.
    - Provide a clear title and description for your PR.
    - Reference any related issues (e.g., `Closes #123`).
    - Ensure all CI checks pass.

## 3. Development Setup

### 3.1 Prerequisites

- Node.js (LTS version, currently 22+)
- npm (Node Package Manager)
- Docker and Docker Compose (for local database and Redis)
- Git

### 3.2 Getting Started

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/handoverkey/handoverkey.git
    cd handoverkey
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

    This will install dependencies for the monorepo and all its packages.

3.  **Set up environment variables:**

    ```bash
    cp apps/api/.env.example apps/api/.env
    cp apps/web/.env.example apps/web/.env
    # Edit the .env files with your local configuration (JWT_SECRET is required)
    ```

4.  **Start local services (PostgreSQL, Redis):**

    ```bash
    npm run docker:up
    ```

5.  **Run database migrations:**

    ```bash
    npm run db:migrate
    ```

6.  **Build all packages and start development servers:**
    ```bash
    npm run build
    npm run dev
    ```
    This starts the API server at `http://localhost:3001` and the web app at `http://localhost:5173`.

### 3.3 Running Tests

To run tests for a specific package:

```bash
# Web application tests
npm test --workspace=@handoverkey/web

# API tests
npm test --workspace=@handoverkey/api

# Crypto package tests (with coverage)
npm run test:coverage --workspace=@handoverkey/crypto

# All other packages
npm test --workspace=@handoverkey/database
npm test --workspace=@handoverkey/shared
```

To run all tests across the entire monorepo:

```bash
npm test
```

Ensure all tests pass before submitting a pull request. New features should include comprehensive test coverage.

### 3.4 Code Style

We use ESLint and Prettier for code linting and formatting. Please ensure your code adheres to the configured style.

You can run the linter and formatter manually:

```bash
npm run lint
npm run format
```

Many IDEs have integrations for ESLint and Prettier that can automatically format your code on save.

## 4. Project Structure

The project is a monorepo managed with [Turborepo](https://turbo.build/).

```
handoverkey/
├── apps/
│   ├── api/                 # Express REST API (Node.js backend)
│   │   ├── src/
│   │   │   ├── controllers/ # HTTP request handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── routes/      # Route definitions
│   │   │   ├── middleware/   # Auth, validation, error handling
│   │   │   ├── validation/  # Zod schemas
│   │   │   └── __tests__/   # Integration tests
│   └── web/                 # React SPA (Vite + Tailwind)
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── pages/       # Application pages
│       │   ├── services/    # API client and encryption
│       │   └── __tests__/   # Unit and integration tests
├── packages/
│   ├── crypto/              # AES-256-GCM, PBKDF2, Shamir's Secret Sharing
│   ├── database/            # Kysely repositories and migrations
│   └── shared/              # Shared types, constants, validation
├── docs/                    # Architecture, security, API reference
└── scripts/                 # Development scripts
```

## 5. Security Policy

Please see our [Security Policy](SECURITY.md) for details on how to report vulnerabilities.

## 6. License

By contributing to HandoverKey, you agree that your contributions will be licensed under its MIT License.

---

Thank you for contributing to HandoverKey!
