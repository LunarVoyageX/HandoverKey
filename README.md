# HandoverKey

<div align="center">

**Zero-Knowledge Digital Legacy Platform & Dead Man's Switch**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](https://github.com/handoverkey/handoverkey/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/handoverkey/handoverkey/ci.yml?branch=main)](https://github.com/handoverkey/handoverkey/actions)
[![Tests](https://img.shields.io/badge/Tests-227%20Passing-brightgreen.svg)](https://github.com/handoverkey/handoverkey/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[Features](#key-features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## About

**HandoverKey** is a secure, open-source digital legacy platform designed to ensure your critical digital assets (passwords, crypto keys, documents) are securely passed to your trusted contacts if something happens to you.

It operates as a **"Dead Man's Switch"**:
1.  You store encrypted secrets in your vault.
2.  You designate trusted successors.
3.  If you fail to check in for a configurable period (e.g., 90 days), the system initiates a handover protocol.
4.  Secrets are securely reconstructed and released to your verified successors.

### Why HandoverKey?

*   **🛡️ Zero-Knowledge Architecture**: We cannot see your data. Encryption happens client-side (AES-256-GCM) before it ever leaves your device.
*   **🔑 Shamir's Secret Sharing**: Split your encryption keys among multiple trusted contacts so no single person can access your data prematurely.
*   **⚡ Production Ready**: Built with a modern stack, comprehensive observability, and rigorous testing.

---

## Key Features

- **Client-Side Encryption**: Web Crypto API implementation ensures data is opaque to the server.
- **Configurable Dead Man's Switch**: Set your check-in frequency and grace periods.
- **Multi-Party Handover**: Require $M$ of $N$ successors to collaborate to unlock your vault.
- **Secure Vault**: Manage passwords, notes, and files with a familiar interface.
- **Audit Logging**: Immutable logs of all access attempts and system events.
- **Background Processing**: Reliable job queues for inactivity monitoring and email notifications.

---

## Architecture

HandoverKey is built as a monorepo using [Turbo](https://turbo.build/).

```mermaid
graph TD
    Client[Web Client (React)] -->|HTTPS/REST| API[API Server (Express)]
    API -->|SQL| DB[(PostgreSQL)]
    API -->|Cache/Queues| Redis[(Redis)]
    Worker[Background Worker] -->|Process Jobs| Redis
    Worker -->|Update Status| DB
```

### Project Structure

| Path | Description |
| :--- | :--- |
| **`apps/`** | Application entry points |
| ├── `web` | React 19 frontend (Vite, Tailwind, TanStack Query) |
| ├── `api` | Node.js 22 Express backend (REST API, BullMQ) |
| **`packages/`** | Shared libraries |
| ├── `crypto` | Core cryptographic primitives (AES-GCM, Shamir, PBKDF2) |
| ├── `database` | Kysely database client and repositories |
| ├── `shared` | Shared types, utilities, and constants |

---

## Getting Started

### Prerequisites

*   **Node.js**: v22.0.0 or higher
*   **Docker**: For running local infrastructure (PostgreSQL, Redis)
*   **npm**: v9.0.0 or higher

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/handoverkey/handoverkey.git
    cd handoverkey
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Copy the example environment file and configure your secrets.
    ```bash
    cp env.example .env
    # Edit .env with your local configuration
    ```

4.  **Start Infrastructure**
    Spin up PostgreSQL and Redis using Docker Compose.
    ```bash
    npm run docker:up
    ```

5.  **Database Migration**
    Initialize the database schema.
    ```bash
    npm run db:migrate
    ```

6.  **Build Packages**
    Compile all shared packages and applications.
    ```bash
    npm run build
    ```

7.  **Start Development Servers**
    Launch the API and Web client in development mode.
    ```bash
    npm run dev
    ```

    *   Web App: `http://localhost:3000`
    *   API: `http://localhost:3001`

---

## Testing

We use **Vitest** for unit and integration testing.

```bash
# Run all tests across the monorepo
npm test

# Run tests for a specific workspace
npm test --workspace=@handoverkey/api

# Run tests with coverage report
npm test -- --coverage
```

---

## Security

Security is the core of HandoverKey.

*   **Encryption**: AES-256-GCM for data, PBKDF2 (100k+ iterations) for key derivation.
*   **Zero-Knowledge**: The server never sees the raw user password or the data encryption key (DEK).
*   **Dependencies**: We minimize external dependencies to reduce supply chain attack surface.

For a deep dive into our security model, please read [docs/security.md](docs/security.md).

### Reporting Vulnerabilities

**Do not open GitHub issues for security vulnerabilities.**  
Please email security@handoverkey.com (placeholder) or refer to our [Security Policy](SECURITY.md).

---

## Documentation

*   [**Architecture Guide**](docs/architecture.md): System design, component interaction, and data flow.
*   [**API Reference**](docs/api.md): Endpoints, request/response schemas, and authentication.
*   [**Deployment**](docs/deployment.md): Docker, Kubernetes, and cloud deployment strategies.
*   [**Contributing**](CONTRIBUTING.md): Guidelines for code style, PRs, and development workflow.

---

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Roadmap

- [ ] Mobile applications (iOS & Android)
- [ ] CLI tool for power users
- [ ] Hardware key support (YubiKey, FIDO2)
- [ ] Encrypted file attachments
- [ ] Multi-language support

---

<div align="center">
  <sub>Built with ❤️ by the HandoverKey Community</sub>
</div>
