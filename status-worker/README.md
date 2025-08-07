# GoHalalLife Status Worker

A Cloudflare Worker that provides health check endpoints for monitoring the GoHalalLife platform.

## Overview

This worker provides authenticated health check endpoints to monitor:
- Database connectivity and record counts
- Full-text search functionality
- Query performance metrics
- Overall system health

## Endpoints

### Public Endpoints

- `GET /` - Service information
- `GET /status` - Basic status check (no auth required)

### Protected Endpoints (require X-API-Key header)

- `GET /health/db` - Database health and connectivity
- `GET /health/fts` - Full-text search functionality
- `GET /health/performance` - Query performance metrics
- `GET /health/all` - Aggregated health status

## Authentication

Protected endpoints require one of:
1. `X-API-Key` header matching the configured API key
2. Request from an allowed IP range (e.g., GitHub Actions)

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# Deploy to production
pnpm deploy:prod
```

## Environment Variables

- `API_KEY` - Required API key for authentication
- `ALLOWED_IPS` - Comma-separated list of allowed IP ranges
- `ENVIRONMENT` - Environment name (development/production)

## Testing Locally

```bash
# Test public status endpoint
curl http://localhost:8787/status

# Test protected endpoints with API key
curl -H "X-API-Key: test-api-key-12345" http://localhost:8787/health/all
```

## Response Format

All health endpoints return:
- `status`: Overall health status (healthy/degraded/error)
- `checks`: Detailed check results
- `timestamp`: Check timestamp
- `responseTime`: Total response time

## Integration with Upptime

This worker is designed to work with Upptime for comprehensive monitoring:
1. Upptime monitors the public `/status` endpoint
2. GitHub Actions use authenticated endpoints for detailed checks
3. Results are displayed on the status page