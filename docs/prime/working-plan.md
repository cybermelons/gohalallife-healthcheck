# GoHalalLife Health Check System - Working Plan

## Project Overview
Set up a comprehensive health check system for GoHalalLife that:
- Uses Upptime for automated production monitoring (GitHub Actions)
- Provides CLI tool for local testing of both environments
- Generates unified status pages

## Architecture

### 1. **Production Monitoring (Upptime + GitHub Actions)**
- Runs automatically every 5 minutes
- Checks ONLY production endpoints
- Generates public status page at GitHub Pages
- Uses a separate `.upptimerc.yml` or filtered configuration

### 2. **Local CLI Tool**
- Runs Upptime workflows locally
- Checks BOTH local AND production endpoints
- Generates combined status page for development
- Uses the full `.upptimerc.yml` configuration

## Implementation Tasks

### Phase 1: Configure Dual Upptime Setup
- [x] Create production-only configuration (`.upptimerc.prod.yml`)
  - Remove all localhost:8787 endpoints
  - Keep only production URLs
  - Used by GitHub Actions
  
- [ ] Keep full configuration (`.upptimerc.yml`) 
  - Contains both local and production endpoints
  - Used by CLI tool for comprehensive testing

### Phase 2: Update CLI Tool
- [x] Remove custom health check implementation
  - [x] Delete axios-based endpoint checking
  - [x] Remove custom HTML generation
  - [x] Remove environment URL mapping logic

- [x] Implement Upptime workflow wrapper
  ```javascript
  // Run Upptime with full config for local testing
  execSync('npx @upptime/uptime-monitor update', { stdio: 'inherit' });
  ```

### Phase 3: Configure GitHub Actions
- [x] Update `.github/workflows/uptime.yml`
  - Use `.upptimerc.prod.yml` for production monitoring
  - Ensures GitHub Actions only checks production

### Phase 4: Update Package Scripts
- [x] Simplify package.json scripts:
  ```json
  {
    "status": "node cli/index.js status",
    "status:build": "node cli/index.js build",
    "status:prod": "node cli/index.js prod",
    "status:update": "node cli/index.js update",
    "status:graphs": "node cli/index.js graphs",
    "serve": "cd status-page && npx serve"
  }
  ```

### Phase 5: Documentation
- [ ] Update README with new workflow
- [ ] Document the dual configuration approach
- [ ] Add troubleshooting guide

## Configuration Split

### `.upptimerc.yml` (Full - for CLI)
Contains all endpoints:
- GoHalalLife Main Site (Production)
- Search API (Production)
- Local Dev Site (localhost:8787)
- Local Dev API (localhost:8787)
- Status Worker endpoints (both local and production)

### `.upptimerc.prod.yml` (Production only - for GitHub Actions)
Contains only production endpoints:
- GoHalalLife Main Site (https://gohalallife.com)
- Search API (Production)
- Status Worker endpoints (production URLs only)

## Expected Behavior

### GitHub Actions (Production)
- Runs every 5 minutes
- Checks only production endpoints
- Never tries to reach localhost
- Generates public status page

### Local CLI
- Developer runs `pnpm status:build`
- Checks both local and production endpoints
- Shows combined health status
- Helps verify local setup matches production

## Benefits
1. **Production stability** - GitHub Actions never fails due to local endpoints
2. **Development insight** - CLI shows both environments side-by-side
3. **Single tool** - Upptime handles all monitoring
4. **Consistency** - Same monitoring engine for both use cases

## Current Status
- [x] Dependencies installed
- [x] CLI refactored with simplified health checks
- [x] Created production-only config (.upptimerc.prod.yml)
- [x] GitHub Actions configured for production monitoring
- [x] Basic health checks working via CLI
- [ ] Full Upptime integration pending (requires native dependencies)