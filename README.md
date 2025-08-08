# GoHalalLife Health Check

Health check and status monitoring for GoHalalLife services.

## Overview

This repository contains:
- **CLI Tool**: Local development tool for checking service health
- **Status Worker**: Cloudflare Worker providing health check endpoints
- **Upptime Integration**: GitHub Actions-based uptime monitoring

## Quick Start

```bash
# Install dependencies
pnpm install

# Check all endpoints (local + production)
pnpm status

# Check production endpoints only
pnpm status:prod

# View status commands
pnpm status:build  # Show build info
pnpm status:graphs # Show graphs info
pnpm status:update # Show update info
```

## CLI Commands

### Status Checks
- `pnpm status` - Quick health check of key endpoints
- `pnpm status:prod` - Check production endpoints only
- `pnpm status:build` - Information about building status pages
- `pnpm status:graphs` - Information about generating graphs
- `pnpm status:update` - Information about running updates

### View Status Page
```bash
pnpm serve  # Serve the status page locally (after GitHub Actions generates it)
```

## Project Structure

```
gohalallife-healthcheck/
├── cli/                    # Local CLI tool
│   └── index.js           # Main CLI script
├── status-worker/         # Cloudflare Worker
│   ├── src/              # Worker source code
│   └── wrangler.toml     # Worker configuration
├── uptime-monitor/        # Upptime monitor (submodule)
├── status-page/           # Upptime status page (submodule)
├── .upptimerc.yml         # Upptime configuration
└── history/               # Status history (generated)
```

## Configuration

### Dual Configuration System

This project uses two Upptime configurations:

1. **`.upptimerc.yml`** - Full configuration with all endpoints (local + production)
   - Used for local testing and development
   - Contains localhost endpoints for testing local services

2. **`.upptimerc.prod.yml`** - Production-only configuration
   - Used by GitHub Actions for automated monitoring
   - Excludes localhost endpoints to prevent false failures

### Upptime Configuration

Endpoints are configured in YAML files:

```yaml
sites:
  - name: "Site Name"
    url: https://example.com
    expectedStatusCodes:
      - 200
      - 201
    headers:
      - "X-API-Key: ${{ secrets.HEALTH_API_KEY }}"  # For authenticated endpoints
```

**Note**: The CLI provides basic health checks. Full Upptime features (graphs, history, incidents) are handled by GitHub Actions.

## Status Worker

The status worker provides health check endpoints:

- `/health` - Basic health check
- `/health/db` - Database connectivity
- `/health/fts` - Full-text search functionality
- `/health/performance` - Performance metrics
- `/health/all` - All checks combined

### Deploy Worker

```bash
pnpm status-worker:deploy
```

## Development

### Local Testing

1. Start the status worker locally:
   ```bash
   pnpm status-worker:dev
   ```

2. Run health checks:
   ```bash
   pnpm status:local
   ```

### Adding New Endpoints

1. Add to `.upptimerc.yml` for local testing
2. Add to `.upptimerc.prod.yml` if it should be monitored in production
3. Run `pnpm status` to test locally
4. Commit and push - GitHub Actions will handle the rest

## GitHub Actions

This repository includes GitHub Actions workflows for:
- Automated uptime monitoring (every 5 minutes)
- Status page generation
- Incident management

## License

MIT