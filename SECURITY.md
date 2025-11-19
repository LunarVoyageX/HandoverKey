# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of HandoverKey seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

Please send an email to **security@handoverkey.com**.

In your email, please include:

*   The type of vulnerability (e.g., SQL injection, XSS, buffer overflow)
*   Full paths of source file(s) related to the manifestation of the vulnerability
*   The location of the affected source code (tag/branch/commit or direct URL)
*   Any special configuration required to reproduce the issue
*   Step-by-step instructions to reproduce the issue
*   Proof-of-concept or exploit code (if available)
*   Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

*   We will acknowledge receipt of your report within **24 hours**.
*   We will provide a more detailed response within **48 hours**, including our initial assessment of the issue.
*   We will keep you updated on our progress as we work to resolve the issue.

### Bounty Program

We do not currently have a paid bug bounty program, but we will happily acknowledge your contribution in our Hall of Fame (with your permission) once the vulnerability has been resolved and disclosed.

## Security Best Practices for Contributors

*   **Never commit secrets**: Ensure no API keys, passwords, or other sensitive information are committed to the repository.
*   **Use secure coding practices**: Follow OWASP guidelines and other industry standards.
*   **Review dependencies**: Keep dependencies up-to-date and audit them for known vulnerabilities.

## Disclosure Policy

We follow a [Coordinated Vulnerability Disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure) process. We ask that you give us a reasonable amount of time to resolve the issue before disclosing it to the public.
