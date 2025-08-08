#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration for environment mappings
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

// Load Upptime configuration
function loadUptimeConfig() {
  const configPath = join(dirname(__dirname), '.upptimerc.yml');
  if (!existsSync(configPath)) {
    console.error(chalk.red('Error: .upptimerc.yml not found'));
    process.exit(1);
  }
  return yaml.load(readFileSync(configPath, 'utf8'));
}

// Perform health check on a single endpoint
async function checkEndpoint(site, envConfig) {
  const spinner = ora(`Checking ${site.name}...`).start();
  
  try {
    // Build the URL based on environment
    let url = site.url;
    if (envConfig) {
      // Replace base URL with environment-specific URL
      const originalBase = url.match(/https?:\/\/[^\/]+/)[0];
      url = url.replace(originalBase, envConfig.baseUrl);
    }
    
    // Add headers including API key if needed
    const headers = {};
    site.headers?.forEach(header => {
      const [key, value] = header.split(':').map(s => s.trim());
      // Handle case-insensitive API key header
      if (key.toLowerCase() === 'x-api-key') {
        // Replace GitHub secrets syntax or use env config API key
        if (value.includes('${{') && envConfig?.apiKey) {
          headers[key] = envConfig.apiKey;
        } else if (!value.includes('${{')) {
          headers[key] = value;
        }
      } else {
        headers[key] = value;
      }
    });
    
    const startTime = Date.now();
    const response = await axios({
      method: site.method || 'GET',
      url,
      headers,
      timeout: 30000,
      validateStatus: () => true // Don't throw on non-2xx status
    });
    const responseTime = Date.now() - startTime;
    
    // Determine status based on Upptime logic
    const expectedStatusCodes = site.expectedStatusCodes || [200, 201, 202, 203, 204];
    const isExpectedStatus = expectedStatusCodes.includes(response.status);
    const isSlowResponse = responseTime > (site.maxResponseTime || 5000);
    
    let status = 'up';
    if (!isExpectedStatus) {
      status = 'down';
    } else if (isSlowResponse) {
      status = 'degraded';
    }
    
    // Check response body for specific text if configured
    const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    if (status === 'up' && site.__dangerous__body_down && responseBody.includes(site.__dangerous__body_down)) {
      status = 'down';
    }
    if (status === 'up' && site.__dangerous__body_degraded && responseBody.includes(site.__dangerous__body_degraded)) {
      status = 'degraded';
    }
    
    spinner.succeed(
      `${getStatusIcon(status)} ${site.name} - ${chalk.gray(url)} - ` +
      `${getStatusColor(status)(status)} - ` +
      `${chalk.cyan(response.status)} - ` +
      `${chalk.yellow(responseTime + 'ms')}`
    );
    
    return {
      name: site.name,
      url,
      status,
      code: response.status,
      responseTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    spinner.fail(
      `${getStatusIcon('down')} ${site.name} - ${chalk.gray(site.url)} - ` +
      `${chalk.red('down')} - ${chalk.red(error.message)}`
    );
    
    return {
      name: site.name,
      url: site.url,
      status: 'down',
      code: 0,
      responseTime: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Get status icon
function getStatusIcon(status) {
  switch (status) {
    case 'up': return chalk.green('✅');
    case 'degraded': return chalk.yellow('⚠️');
    case 'down': return chalk.red('❌');
    default: return '❓';
  }
}

// Get status color function
function getStatusColor(status) {
  switch (status) {
    case 'up': return chalk.green;
    case 'degraded': return chalk.yellow;
    case 'down': return chalk.red;
    default: return chalk.gray;
  }
}

// Generate status page HTML
function generateStatusPage(results, envName) {
  const timestamp = new Date().toISOString();
  const summary = {
    up: results.filter(r => r.status === 'up').length,
    degraded: results.filter(r => r.status === 'degraded').length,
    down: results.filter(r => r.status === 'down').length,
    total: results.length
  };
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GoHalalLife Health Check - ${envName || 'All Environments'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .summary {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-item {
      flex: 1;
      padding: 20px;
      background: white;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-item.up { border-top: 4px solid #4CAF50; }
    .summary-item.degraded { border-top: 4px solid #FF9800; }
    .summary-item.down { border-top: 4px solid #F44336; }
    .summary-value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    .endpoints {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .endpoint {
      padding: 15px;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .endpoint:last-child {
      border-bottom: none;
    }
    .endpoint-name {
      font-weight: 500;
    }
    .endpoint-url {
      color: #666;
      font-size: 14px;
      margin-top: 4px;
    }
    .endpoint-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
    }
    .status-badge.up {
      background: #E8F5E9;
      color: #2E7D32;
    }
    .status-badge.degraded {
      background: #FFF3E0;
      color: #F57C00;
    }
    .status-badge.down {
      background: #FFEBEE;
      color: #C62828;
    }
    .response-time {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GoHalalLife Health Check</h1>
    <div class="timestamp">Last checked: ${new Date(timestamp).toLocaleString()}</div>
    
    <div class="summary">
      <div class="summary-item up">
        <div>Operational</div>
        <div class="summary-value">${summary.up}</div>
      </div>
      <div class="summary-item degraded">
        <div>Degraded</div>
        <div class="summary-value">${summary.degraded}</div>
      </div>
      <div class="summary-item down">
        <div>Down</div>
        <div class="summary-value">${summary.down}</div>
      </div>
    </div>
    
    <div class="endpoints">
      <h2>Endpoints</h2>
      ${results.map(r => `
        <div class="endpoint">
          <div>
            <div class="endpoint-name">${r.name}</div>
            <div class="endpoint-url">${r.url}</div>
          </div>
          <div class="endpoint-status">
            <span class="status-badge ${r.status}">${r.status.toUpperCase()}</span>
            <span class="response-time">${r.responseTime}ms</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
  
  return html;
}

// Main CLI program
program
  .name('gohalallife-healthcheck')
  .description('CLI tool for checking GoHalalLife service health')
  .version('1.0.0');

program
  .option('-e, --env <environment>', 'Environment to check (local, production, all)', 'all')
  .option('-b, --build', 'Build status page after checks')
  .option('--host <url>', 'Custom host URL to check')
  .action(async (options) => {
    const config = loadUptimeConfig();
    const results = [];
    
    console.log(chalk.bold('\n🏥 GoHalalLife Health Check\n'));
    
    // Determine which environments to check
    let environments = [];
    if (options.host) {
      environments = [{ name: 'custom', config: { baseUrl: options.host } }];
    } else if (options.env === 'all') {
      environments = Object.entries(ENV_CONFIG).map(([name, config]) => ({ name, config }));
    } else if (ENV_CONFIG[options.env]) {
      environments = [{ name: options.env, config: ENV_CONFIG[options.env] }];
    } else {
      console.error(chalk.red(`Unknown environment: ${options.env}`));
      process.exit(1);
    }
    
    // Check each environment
    for (const env of environments) {
      if (environments.length > 1) {
        console.log(chalk.bold.blue(`\n${env.name.toUpperCase()} Environment:\n`));
      }
      
      for (const site of config.sites) {
        const result = await checkEndpoint(site, env.config);
        results.push({ ...result, environment: env.name });
      }
    }
    
    // Summary
    console.log(chalk.bold('\n📊 Summary:\n'));
    const summary = {
      up: results.filter(r => r.status === 'up').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      down: results.filter(r => r.status === 'down').length
    };
    
    console.log(`  ${chalk.green('✅ Operational:')} ${summary.up}`);
    console.log(`  ${chalk.yellow('⚠️  Degraded:')} ${summary.degraded}`);
    console.log(`  ${chalk.red('❌ Down:')} ${summary.down}`);
    console.log(`  ${chalk.gray('Total:')} ${results.length}`);
    
    // Generate status page if requested
    if (options.build) {
      const historyDir = join(dirname(__dirname), 'history');
      if (!existsSync(historyDir)) {
        mkdirSync(historyDir);
      }
      
      // Save results as JSON
      const summaryPath = join(historyDir, 'summary.json');
      writeFileSync(summaryPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        results,
        summary
      }, null, 2));
      
      // Generate HTML page
      const html = generateStatusPage(results, options.env);
      const htmlPath = join(dirname(__dirname), 'status.html');
      writeFileSync(htmlPath, html);
      
      console.log(chalk.green(`\n✅ Status page generated: ${htmlPath}`));
    }
    
    // Exit with error code if any services are down
    if (summary.down > 0) {
      process.exit(1);
    }
  });

program.parse();