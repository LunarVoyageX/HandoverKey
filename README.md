# Project HandoverKey

**A stupidly secure, open-source digital legacy platform with dead man's switch functionality.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](https://github.com/handoverkey/handoverkey/releases)
[![Tests](https://img.shields.io/badge/Tests-227%20Passing-brightgreen.svg)](https://github.com/handoverkey/handoverkey/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

## What is HandoverKey?

HandoverKey is a zero-knowledge, end-to-end encrypted digital legacy platform that ensures your digital assets are securely passed to your trusted contacts if something happens to you. Think of it as a "dead man's switch" for your digital life.

### Key Features

- **Zero-Knowledge Encryption**: Your data is encrypted client-side using Web Crypto API (AES-256-GCM) before it ever reaches our servers
- **Dead Man's Switch**: Automatic handover after configurable inactivity period (default: 90 days)
- **Multi-Party Handover**: Require multiple trusted contacts to confirm before release using Shamir's Secret Sharing
- **Secure Vault Management**: Full-featured web interface for managing encrypted digital assets
- **Production-Ready**: Comprehensive observability with structured logging (Pino), metrics (Prometheus), and monitoring
- **Reliable Background Jobs**: BullMQ-powered job queue with Redis for inactivity monitoring and notifications
- **Type-Safe**: Full TypeScript implementation with runtime validation using Zod
- **Audit Trail**: Complete transparency of all access attempts and system events
- **Open Source**: 100% open source stack - no proprietary dependencies

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query, Tailwind CSS
- **Backend**: Node.js 22, Express, Kysely, Zod, BullMQ
- **Observability**: Pino (logging), Prometheus (metrics)
- **Database**: PostgreSQL 14+, Redis 6+
- **Encryption**: Web Crypto API (AES-256-GCM, PBKDF2)

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Local Development

```bash
# Clone the repository
git clone https://github.com/handoverkey/handoverkey.git
cd handoverkey

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Build all packages
npm run build

# Start development servers
npm run dev
```

Visit `http://localhost:3000` to access the web application.

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=@handoverkey/api

# Run tests with coverage
npm test -- --coverage
```

## Security

- Client-side AES-256-GCM encryption (zero-knowledge)
- PBKDF2 key derivation (100k+ iterations)
- Shamir's Secret Sharing for multi-party handover
- Input validation, rate limiting, security headers
- Full audit logging

See [Security Model](docs/security.md) for details.

## Observability

- **Logging**: Pino structured JSON logs with request tracing
- **Metrics**: Prometheus metrics at `/metrics`
- **Health**: Health check at `/health`
- **Jobs**: BullMQ for reliable background processing

## Documentation

- [Architecture Guide](docs/architecture.md) - System design and components
- [Security Model](docs/security.md) - Encryption and security implementation
- [API Reference](docs/api.md) - REST API documentation
- [Deployment Guide](docs/deployment.md) - Production deployment
- [Testing Guide](docs/testing.md) - Testing strategy and guidelines
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute

## Development

```bash
npm run dev              # Start dev servers
npm run build            # Build all packages
npm test                 # Run tests (227 passing)
npm run lint             # Lint code
npm run db:migrate       # Run migrations
```

## Contributing

We welcome contributions! HandoverKey is built by the community, for the community.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [Contributing Guidelines](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/handoverkey/handoverkey/issues)
- **Discussions**: [GitHub Discussions](https://github.com/handoverkey/handoverkey/discussions)
- **Documentation**: [docs/](docs/)

## Roadmap

- [ ] Mobile applications (iOS & Android)
- [ ] CLI tool for power users
- [ ] Hardware key support (YubiKey, FIDO2)
- [ ] Encrypted file attachments
- [ ] Multi-language support
- [ ] Self-hosted deployment guides
- [ ] Kubernetes deployment manifests

## Disclaimer

HandoverKey is designed for digital legacy planning and should not be used as a replacement for legal estate planning. Always consult with legal professionals for proper estate planning.

---

**Made with ❤️ by the HandoverKey community**
