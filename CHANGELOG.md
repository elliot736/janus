# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-22

### Core
- Proof-of-work challenge system with HMAC-bound SHA-256 challenges
- Browser fingerprinting (canvas, WebGL, audio, fonts, navigator)
- Behavioral analysis (mouse velocity, keyboard timing, scroll, touch)
- Automation detection (Selenium, Puppeteer, PhantomJS, CDP, headless)
- Cross-signal validation and fingerprint velocity tracking
- Risk scoring engine (0-100) with mode-aware behavioral weighting
- HMAC-signed verification tokens with 5-minute TTL
- Server-side token validation (`/api/v1/siteverify`)

### GeoIP Intelligence
- Self-hosted MaxMind GeoLite2 database lookups
- Datacenter, VPN, and proxy detection
- Per-site country blocklists
- GDPR-safe: only country code stored, never IP-to-location mapping

### Adaptive Difficulty
- Automatic PoW difficulty adjustment based on real-time block rate
- 5-minute sliding window with 4 escalation tiers
- Auto-decay when traffic normalizes
- Dashboard display on analytics and settings pages

### Plugin System
- Global and site-scoped risk scoring plugins
- Priority-ordered execution with score accumulation
- Per-plugin adjustment clamped to ±50
- Error isolation: plugins never block verification
- Built-in plugins: `rate-abuse-detector`, `time-of-day`

### Platform
- Admin dashboard with site management, analytics, verification logs
- Real-time analytics via Server-Sent Events
- Donut chart, risk gauge, activity feed, anomaly badges
- Two-factor authentication (TOTP) for dashboard accounts
- Site-scoped API keys with SHA-256 hashing
- Per-site rate limits and risk score weights
- Domain allowlisting with origin validation

### Alerting & Webhooks
- Email alerting via SMTP with per-event throttling
- Webhook notifications with HMAC-SHA256 signed payloads

### Infrastructure
- Redis-backed rate limiting with circuit breaker
- Prometheus metrics with Redis persistence across restarts
- Correlation IDs for end-to-end request tracing
- Configurable database connection pooling
- OpenAPI/Swagger docs at `/docs`
- Versioned SDK CDN paths with immutable caching
- Health checks (`/health`, `/ready`) and structured JSON logging
- Terraform for AWS (ECS Fargate, RDS, ElastiCache, ALB, CloudFront)
- Docker Compose for production and development
- GitHub Actions CI/CD with OIDC authentication

### SDK & Integrations
- Browser SDK (~5KB gzipped, zero dependencies)
- Retry with exponential backoff for network failures
- Bundle size CI check (8KB budget)
- `@janus/react` — JanusProvider, useJanus(), JanusWidget, JanusInvisible
- `@janus/nextjs` — client components, server-side verification, middleware protection
- `@janus/express` — janusVerify() middleware, standalone verifyToken()

### Privacy
- GDPR compliance mode with IP anonymization and auto-retention
- Right to erasure API endpoints
- No cookies, no third-party scripts, no cross-site tracking
- Site-scoped fingerprint hashes

### Documentation
- Fumadocs site with 18 pages
- Interactive demo (human vs bot simulation)
- Integration guides for React, Next.js, Express, HTML
- API reference with all endpoints
- Light/dark mode with #d4a254 accent
