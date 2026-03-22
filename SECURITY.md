# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Janus, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **security@janus.dev** (or open a [private security advisory](https://github.com/elliot736/janus/security/advisories/new) on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security design

Janus is built with security as a core design principle:

- **All secrets** required via environment variables — the app refuses to start without them
- **Client SDK treated as untrusted** — every claim is validated server-side
- **HMAC token signatures** verified with constant-time comparison (`crypto.timingSafeEqual`)
- **IP extraction** from `X-Real-IP` only (set by Nginx), never from client-controlled headers
- **Redis failures fail closed** — rate limiting and replay protection deny requests when Redis is down
- **Secret keys stored as SHA-256 hashes**, never in plaintext
- **Fingerprint payloads size-limited** to 64KB
- **Nonce replay protection** via Redis SET NX with TTL
- **Webhook payloads signed** with HMAC-SHA256
- **Plugin errors isolated** — never block the verification flow
- **GDPR mode** anonymizes IPs before storage

## Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- SQL injection, XSS, CSRF
- Token forgery or replay attacks
- Information disclosure (secrets, PII leakage)
- Denial of service vulnerabilities in the API
- SDK vulnerabilities that could be exploited by malicious sites

Out of scope:
- Rate limiting tuning (this is configurable, not a vulnerability)
- Detection evasion by sophisticated bots (this is an ongoing arms race, not a security bug)
- Issues in third-party dependencies (report those upstream)
