#!/usr/bin/env node

import { program } from 'commander';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Check if running in the correct directory
function checkDirectory() {
  const upptimeConfig = join(projectRoot, '.upptimerc.yml');
  if (!existsSync(upptimeConfig)) {
    console.error(chalk.red('Error: .upptimerc.yml not found'));
    console.error(chalk.yellow('Make sure you are running this from the gohalallife-healthcheck directory'));
    process.exit(1);
  }
}

// Run an Upptime command
function runUpptime(command, description) {
  const spinner = ora(description).start();
  
  try {
    // Change to project root to ensure correct paths
    process.chdir(projectRoot);
    
    // Run the Upptime command
    const output = execSync(`pnpx @upptime/uptime-monitor ${command}`, {
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    spinner.succeed(`${description} - Complete`);
    
    if (output) {
      console.log(chalk.gray(output));
    }
    
    return true;
  } catch (error) {
    spinner.fail(`${description} - Failed`);
    console.error(chalk.red(error.message));
    if (error.stderr) {
      console.error(chalk.red(error.stderr.toString()));
    }
    return false;
  }
}

// Main CLI program
program
  .name('gohalallife-healthcheck')
  .description('CLI tool for checking GoHalalLife service health using Upptime')
  .version('2.0.0');

// Default command - check status
program
  .command('status', { isDefault: true })
  .description('Check health status of all configured endpoints')
  .option('-s, --summary', 'Generate summary after checking')
  .action((options) => {
    console.log(chalk.bold('\n🏥 GoHalalLife Health Check\n'));
    
    checkDirectory();
    
    // Run uptime check (no commits)
    const success = runUpptime('', 'Checking all endpoints');
    
    if (success && options.summary) {
      runUpptime('summary', 'Generating summary');
    }
    
    console.log(chalk.green('\n✅ Health check complete\n'));
  });

// Build command - check and generate status page
program
  .command('build')
  .description('Check endpoints and generate status page')
  .action(() => {
    console.log(chalk.bold('\n🏥 GoHalalLife Health Check & Build\n'));
    
    checkDirectory();
    
    // Run complete update workflow
    runUpptime('update', 'Running health checks and updating history');
    runUpptime('response-time', 'Calculating response times');
    runUpptime('summary', 'Generating summary');
    runUpptime('graphs', 'Generating graphs');
    runUpptime('site', 'Building status page');
    
    console.log(chalk.green('\n✅ Status page generated in status-page/ directory\n'));
    console.log(chalk.yellow('Run "pnpm serve" to view the status page locally\n'));
  });

// Graphs command
program
  .command('graphs')
  .description('Generate response time graphs')
  .action(() => {
    console.log(chalk.bold('\n📊 Generating Graphs\n'));
    
    checkDirectory();
    
    runUpptime('graphs', 'Generating response time graphs');
    
    console.log(chalk.green('\n✅ Graphs generated\n'));
  });

// Update command - full update with commits
program
  .command('update')
  .description('Run full update cycle with git commits')
  .action(() => {
    console.log(chalk.bold('\n🔄 Running Full Update\n'));
    
    checkDirectory();
    
    runUpptime('update', 'Updating endpoint status');
    
    console.log(chalk.green('\n✅ Update complete\n'));
  });

// Production check command - use production config
program
  .command('prod')
  .description('Check production endpoints only')
  .action(() => {
    console.log(chalk.bold('\n🏥 GoHalalLife Production Health Check\n'));
    
    checkDirectory();
    
    // Temporarily set environment variable to use production config
    process.env.UPPTIME_RC = '.upptimerc.prod.yml';
    
    runUpptime('', 'Checking production endpoints');
    
    console.log(chalk.green('\n✅ Production health check complete\n'));
  });

program.parse();