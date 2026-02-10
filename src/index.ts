#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { syncCommand } from './commands/sync';
import { sourcesCommand } from './commands/sources';
import { logsCommand } from './commands/logs';
import { ui } from './lib/ui';
import { initLogger } from './lib/logger';

const pkg = require('../package.json');

// Check for updates
const notifier = updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
});

if (notifier.update) {
  console.log(
    ui.box(
      `Update available: ${chalk.dim(notifier.update.current)} → ${chalk.green(notifier.update.latest)}\n\nRun ${chalk.cyan('npm install -g @faros-fde-sandbox/cli')} to update`,
      { borderColor: 'yellow' }
    )
  );
}

async function main() {
  const program = new Command();
  
  program
    .name('faros')
    .description('CLI for Faros AI - sync data, manage sources, view logs')
    .version(pkg.version)
    .addHelpText('before', `
${chalk.bold.blue('Faros CLI')} - Instrumentation & Data Sync
`)
    .addHelpText('after', `
${chalk.bold('Quick Start:')}
  ${chalk.dim('# Sync Linear data (issues, projects, teams, etc.)')}
  $ faros sync linear
  
  ${chalk.dim('# Sync only specific Linear streams')}
  $ faros sync linear --streams issues,projects
  
  ${chalk.dim('# Sync test results')}
  $ faros sync tests test-results/*.xml --source "Jenkins" --commit "GitHub://org/repo/abc"
  
  ${chalk.dim('# Report build status')}
  $ faros sync ci-cd build --status Success --commit "GitHub://org/repo/abc" --run "Jenkins://org/pipeline/123"
  
  ${chalk.dim('# View logs')}
  $ faros logs
  
  ${chalk.dim('# List sources')}
  $ faros sources list

${chalk.bold('Documentation:')} https://docs.faros.ai
${chalk.bold('Support:')} https://community.faros.ai
    `);
  
  // Global options
  program
    .option('-k, --api-key <key>', 'Faros API key (or set FAROS_API_KEY)')
    .option('-u, --url <url>', 'Faros API URL')
    .option('-g, --graph <name>', 'Faros graph name')
    .option('--debug', 'Enable debug logging')
    .option('--quiet', 'Minimal output')
    .option('--json', 'Output JSON (for scripting)')
    .option('--no-color', 'Disable colors');

  // Init file logger (debug level if --debug is present, else info)
  const debugFlag = process.argv.includes('--debug') || process.argv.includes('-d');
  const log = initLogger(debugFlag ? 'debug' : 'info');
  log.info({ version: pkg.version, argv: process.argv.slice(2) }, 'faros-cli started');
  
  // Register commands
  program.addCommand(syncCommand());
  program.addCommand(sourcesCommand());
  program.addCommand(logsCommand());
  
  // Parse arguments
  await program.parseAsync(process.argv);
}

// Run CLI
main().catch((error) => {
  ui.log.error(error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
