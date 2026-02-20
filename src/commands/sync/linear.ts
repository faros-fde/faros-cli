import { Command, Option } from 'commander';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { loadConfig, mergeConfig } from '../../config/loader';
import { ui } from '../../lib/ui';
import { SyncLinearOptions } from '../../types/config';

interface LinearConfig {
  src: {
    image: string;
    config: {
      api_key: string;
      cutoff_days?: number;
      page_size?: number;
    };
  };
  dst: {
    image: string;
    config: {
      edition_configs: {
        api_key: string;
        graph: string;
        api_url?: string;
        origin?: string;
      };
    };
  };
}

function createTempConfig(options: SyncLinearOptions, config: any): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faros-linear-'));
  const configPath = path.join(tempDir, 'faros_airbyte_cli_config.json');

  const airbyteConfig: LinearConfig = {
    src: {
      image: 'farossam/airbyte-linear-source:1.0.1',
      config: {
        api_key: options.linearApiKey || '',
        cutoff_days: options.cutoffDays || 90,
        page_size: options.pageSize || 50,
      },
    },
    dst: {
      image: 'farossam/airbyte-faros-destination:linear',
      config: {
        edition_configs: {
          api_key: config.apiKey,
          graph: config.graph,
          api_url: config.url,
          origin: config.origin,
        },
      },
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(airbyteConfig, null, 2));
  return configPath;
}

async function runAirbyteSync(configPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Find the installed airbyte-local-cli package entry point
    const airbyteLocalPath = require.resolve('@faros-fde-sandbox/airbyte-local-cli');
    
    const args = [airbyteLocalPath, '--config-file', configPath];
    const child = spawn(process.execPath, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to run airbyte-local-cli: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Airbyte sync failed with exit code ${code}`));
      }
    });
  });
}

async function syncLinearData(options: SyncLinearOptions): Promise<void> {
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, options);

  // Get Linear API key from CLI option, env var, or fail
  const linearApiKey = options.linearApiKey || process.env.LINEAR_API_KEY;
  
  if (!linearApiKey) {
    throw new Error('Linear API key is required. Use --linear-api-key or set LINEAR_API_KEY environment variable.');
  }

  if (!config.apiKey) {
    throw new Error('Faros API key is required. Set FAROS_API_KEY environment variable or use --api-key.');
  }

  if (!config.graph) {
    throw new Error('Faros graph is required. Set FAROS_GRAPH environment variable or use --graph.');
  }

  // Get cutoff days and page size from options or config file defaults
  const linearSource = config.sources?.linear;
  const cutoffDays = options.cutoffDays || linearSource?.cutoffDays || 90;
  const pageSize = options.pageSize || linearSource?.pageSize || 50;

  // Preview mode
  if (options.preview) {
    console.log();
    console.log(chalk.bold('Linear Sync Configuration:'));
    console.log();
    console.log(chalk.blue('Source:'));
    console.log(`  Image: farossam/airbyte-linear-source:1.0.1`);
    console.log(`  Cutoff Days: ${cutoffDays}`);
    console.log(`  Page Size: ${pageSize}`);
    console.log();
    console.log(chalk.blue('Destination:'));
    console.log(`  Image: farossam/airbyte-faros-destination:linear`);
    console.log(`  Graph: ${config.graph}`);
    console.log(`  URL: ${config.url}`);
    console.log(`  Origin: ${config.origin}`);
    console.log();
    console.log(chalk.blue('Data Streams:'));
    console.log('  • Teams');
    console.log('  • Projects');
    console.log('  • Issues');
    console.log('  • Users');
    console.log();
    console.log(chalk.dim('Run without --preview to start the sync'));
    return;
  }

  const spinner = ui.spinner('Preparing Linear sync...');
  spinner.start();

  let configPath: string | null = null;

  try {
    // Create temporary config file with resolved values
    const tempOptions = {
      ...options,
      linearApiKey,
      cutoffDays,
      pageSize,
    };
    configPath = createTempConfig(tempOptions, config);
    spinner.succeed('Configuration prepared');

    const syncSpinner = ui.spinner('Syncing Linear data to Faros...');
    syncSpinner.start();

    // Run airbyte-local
    await runAirbyteSync(configPath);

    syncSpinner.succeed('Linear data synced successfully');

    console.log();
    ui.log.success('Sync completed');
    console.log(chalk.dim(`  Graph: ${config.graph}`));
    console.log(chalk.dim(`  View in Faros: ${config.url.replace('/api', '')}/${config.graph}/tms`));
  } catch (error: any) {
    // Try to fail spinner if it's still running
    try {
      if ('isSpinning' in spinner && spinner.isSpinning) {
        spinner.fail('Sync failed');
      } else {
        spinner.fail('Sync failed');
      }
    } catch (e) {
      // Ignore spinner errors
    }
    throw error;
  } finally {
    // Clean up temp config
    if (configPath) {
      try {
        const tempDir = path.dirname(configPath);
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

export function syncLinearCommand(): Command {
  const cmd = new Command('linear');

  cmd
    .description('Sync Linear issues, projects, teams, and users to Faros')
    .option('--linear-api-key <key>', 'Linear API key (or set LINEAR_API_KEY env var)')
    .option('--cutoff-days <days>', 'Fetch issues updated in the last N days', parseInt)
    .option('--page-size <size>', 'Number of records per API call (1-250)', parseInt)
    .option('--preview', 'Show sync configuration without executing')
    .addHelpText('after', `
Examples:
  # Sync Linear data using environment variable
  $ export LINEAR_API_KEY=lin_api_xxx
  $ faros sync linear

  # Or provide API key via CLI option
  $ faros sync linear --linear-api-key lin_api_xxx

  # Sync only recent issues (last 30 days)
  $ faros sync linear --cutoff-days 30

  # Preview configuration before syncing
  $ faros sync linear --preview

Configuration:
  The command reads configuration from multiple sources (in order of precedence):
  1. CLI options (--linear-api-key, --cutoff-days, etc.)
  2. Environment variables (LINEAR_API_KEY, FAROS_API_KEY, FAROS_GRAPH)
  3. Config file (faros.config.yaml)
  4. Defaults (cutoff-days: 90, page-size: 50)

  Example faros.config.yaml:
    url: https://prod.api.faros.ai
    graph: default
    origin: my-company-ci
    sources:
      linear:
        cutoffDays: 30
        pageSize: 100

Notes:
  - Linear API key can be generated at https://linear.app/settings/api
  - The connector syncs: Teams, Projects, Issues, and Users
  - Issues are filtered by update date using the cutoff-days parameter
  - Requires Docker to be running
  - NEVER put API keys in faros.config.yaml - use environment variables
    `)
    .action(async (options) => {
      try {
        await syncLinearData(options);
      } catch (error: any) {
        ui.log.error(error.message);
        if (options.debug) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return cmd;
}
