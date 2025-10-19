# Project HandoverKey

**A stupidly secure, open-source digital legacy platform with dead man's switch functionality.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security: Verified](https://img.shields.io/badge/Security-Verified-green.svg)](https://github.com/handoverkey/security)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/handoverkey/actions)

## What is HandoverKey?

HandoverKey is a zero-knowledge, end-to-end encrypted digital legacy platform that ensures your digital assets are securely passed to your trusted contacts if something happens to you. Think of it as a "dead man's switch" for your digital life.

### Key Features

- **Zero-Knowledge Encryption**: Your data is encrypted client-side before it ever reaches our servers
- **Dead Man's Switch**: Automatic handover after configurable inactivity period (default: 90 days)
- **Multi-Party Handover**: Require multiple trusted contacts to confirm before release
- **Secure Vault Management**: Full-featured web interface for managing encrypted digital assets
- **Cross-Platform**: Web application with mobile and CLI tools planned
- **Hardware Key Support**: YubiKey, FIDO2, and other security keys (planned)
- **Audit Trail**: Complete transparency of all access attempts and system events
- **Open Source**: Full transparency - inspect, verify, and contribute

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

# Quick start
chmod +x scripts/dev.sh
./scripts/dev.sh

# Or manual setup
npm install
npm run build
docker-compose up -d
npm run db:migrate
```

Visit `http://localhost:3000` to access the web application.

## Security

HandoverKey uses zero-knowledge, end-to-end encryption with client-side AES-256-GCM encryption and PBKDF2 key derivation. See [Architecture Guide](docs/architecture.md) for detailed security implementation.

## Documentation

- [Architecture Guide](docs/architecture.md)
- [Security Model](docs/security.md)
- [API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Email: support@handoverkey.com
- Issues: [GitHub Issues](https://github.com/handoverkey/handoverkey/issues)
- Docs: [Documentation](https://github.com/handoverkey/handoverkey/docs)

## Disclaimer

HandoverKey is designed for digital legacy planning and should not be used as a replacement for legal estate planning. Always consult with legal professionals for proper estate planning.

---

**Made by the HandoverKey community**
