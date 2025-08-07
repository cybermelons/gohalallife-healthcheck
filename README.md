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

# Check all environments
pnpm status:all

# Check specific environment
pnpm status:local
pnpm status:production

# Generate status page
pnpm status:build
```

## CLI Commands

### Status Checks
- `pnpm status` - Check all configured endpoints
- `pnpm status:local` - Check local development environment
- `pnpm status:production` - Check production environment
- `pnpm status:all` - Check all environments
- `pnpm status:build` - Check all and generate HTML status page

### Custom Host
```bash
node cli/index.js --host http://localhost:3000
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

### Environment Mapping

The CLI tool maps environments in `cli/index.js`:

```javascript
const ENV_CONFIG = {
  local: {
    baseUrl: 'http://localhost:8787',
    apiKey: 'test-api-key-12345'
  },
  production: {
    baseUrl: 'https://gohalallife-status-production.innovativesolutions109-089.workers.dev',
    apiKey: 'your-secure-health-check-api-key-2025'
  }
};
```

### Upptime Configuration

Edit `.upptimerc.yml` to configure monitored endpoints:

```yaml
sites:
  - name: "Site Name"
    url: https://example.com
    expectedStatusCodes:
      - 200
      - 201
```

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

1. Add to `.upptimerc.yml`
2. Update `ENV_CONFIG` in `cli/index.js` if needed
3. Run checks with `pnpm status`

## GitHub Actions

This repository includes GitHub Actions workflows for:
- Automated uptime monitoring (every 5 minutes)
- Status page generation
- Incident management

## License

MIT