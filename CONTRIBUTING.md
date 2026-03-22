# Contributing to Janus

Thanks for your interest in contributing. This guide covers the basics.

## Development setup

```bash
git clone https://github.com/elliot736/janus.git
cd janus
npm install
cp .env.example .env
# Fill each secret: openssl rand -hex 32

# Start Postgres + Redis
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres redis -d

# Set up schema
cd apps/api && npx drizzle-kit push && cd ../..

# Run everything
npm run dev
```

| Service   | URL                    |
|-----------|------------------------|
| Dashboard | http://localhost:3000   |
| API       | http://localhost:3001   |
| Docs      | http://localhost:3002   |

## Project structure

```
apps/api/         NestJS backend
apps/dashboard/   Next.js admin UI
apps/docs/        Fumadocs documentation site
packages/sdk/     Browser SDK (~5KB)
packages/react/   React components + hooks
packages/nextjs/  Next.js integration
packages/express/ Express middleware
terraform/        AWS infrastructure
```

## Running tests

```bash
# API (142 tests)
cd apps/api && npm test

# Dashboard (26 tests)
cd apps/dashboard && npm test
```

## Making changes

1. Create a branch from `main`
2. Make your changes
3. Run `npm test` in the affected package
4. Run `npx tsc --noEmit` in the affected package
5. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `test:` tests
   - `refactor:` code change that neither fixes a bug nor adds a feature
6. Open a pull request against `main`

## What to work on

Check the [issues](https://github.com/elliot736/janus/issues) page. Issues labeled `good first issue` are a good starting point.

Areas where contributions are welcome:

- **Detection signals** — new fingerprinting techniques, behavioral heuristics
- **Risk plugins** — built-in plugins for common use cases (IP reputation, rate patterns)
- **Framework integrations** — Vue, Svelte, Fastify, Django, Rails
- **Infrastructure** — Helm chart, GCP/Azure Terraform, Pulumi
- **Dashboard** — new visualizations, world map, rate limit monitoring
- **Documentation** — tutorials, examples, translations

## Code style

- TypeScript strict mode
- No `any` unless unavoidable (cast with a comment explaining why)
- Tests for new services and non-trivial logic
- Keep SDK bundle under 8KB gzipped

## Pull request guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update docs if the change is user-facing
- Don't bump versions — maintainers handle releases

## Reporting bugs

Open an issue with:
- What you expected
- What happened
- Steps to reproduce
- Environment (OS, Node version, browser)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
