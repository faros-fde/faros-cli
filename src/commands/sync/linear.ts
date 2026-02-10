import { Command } from 'commander';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import chalk from 'chalk';
import { loadConfig, mergeConfig, getStagingGraph } from '../../config/loader';
import { ui } from '../../lib/ui';
import { getLogger } from '../../lib/logger';
import { SyncLinearOptions, Config } from '../../types/config';

// Default Docker images
const DEFAULT_LINEAR_SRC_IMAGE = 'farosai/airbyte-linear-source';
const DEFAULT_FAROS_DST_IMAGE = 'farosai/airbyte-faros-destination';

// All available Linear streams
const ALL_LINEAR_STREAMS = ['teams', 'users', 'projects', 'issues', 'comments'];

interface AirbyteLocalConfig {
  src: {
    image: string;
    config: Record<string, any>;
  };
  dst: {
    image: string;
    config: Record<string, any>;
  };
}

function buildLinearSourceConfig(
  config: Config,
  options: SyncLinearOptions,
): Record<string, any> {
  const sourceEntry = config.sources?.linear;

  const apiKey = options.linearApiKey || process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Linear API key is required. Provide via --linear-api-key flag or LINEAR_API_KEY env var (in .env file or environment)'
    );
  }

  const srcConfig: Record<string, any> = { api_key: apiKey };

  const cutoffDays = options.cutoffDays ?? sourceEntry?.cutoffDays;
  if (cutoffDays !== undefined) srcConfig.cutoff_days = cutoffDays;

  const startDate = options.startDate ?? sourceEntry?.startDate;
  if (startDate) srcConfig.start_date = startDate;

  const endDate = options.endDate ?? sourceEntry?.endDate;
  if (endDate) srcConfig.end_date = endDate;

  return srcConfig;
}

function buildFarosDestinationConfig(
  config: Config,
  options: SyncLinearOptions,
): Record<string, any> {
  const targetGraph = options.dryRun ? getStagingGraph(config) : config.graph;
  const farosApiKey = config.apiKey;
  if (!farosApiKey) {
    throw new Error(
      'Faros API key is required. Set via --api-key flag or FAROS_API_KEY env var (in .env file or environment)'
    );
  }

  return {
    edition_configs: {
      edition: 'cloud',
      api_key: farosApiKey,
      api_url: config.url,
      graph: targetGraph,
    },
    origin: config.origin,
  };
}

function resolveAirbyteLocalBin(): { command: string; args: string[] } {
  const localPaths = [
    path.resolve(__dirname, '../../../../airbyte-local-cli/airbyte-local-cli-nodejs/lib/index.js'),
    path.resolve(__dirname, '../../../../../airbyte-local-cli/airbyte-local-cli-nodejs/lib/index.js'),
  ];
  for (const p of localPaths) {
    if (fs.existsSync(p)) {
      return { command: process.execPath, args: [p] };
    }
  }

  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { execSync } = require('child_process');
    execSync(`${whichCmd} airbyte-local`, { stdio: 'pipe' });
    return { command: 'airbyte-local', args: [] };
  } catch { /* not on PATH */ }

  return { command: 'npx', args: ['airbyte-local'] };
}

async function syncLinear(options: SyncLinearOptions): Promise<void> {
  const log = getLogger().child({ source: 'sync-linear' });

  // Load and merge config
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, options);
  log.info('Config loaded');

  const sourceEntry = config.sources?.linear;
  if (!sourceEntry && !options.linearApiKey && !process.env.LINEAR_API_KEY) {
    throw new Error(
      'No Linear source configuration found. Add a "linear" entry under "sources" in faros.config.yaml, ' +
      'or provide --linear-api-key'
    );
  }

  // Resolve images
  const srcImage = options.srcImage ?? sourceEntry?.srcImage ?? DEFAULT_LINEAR_SRC_IMAGE;
  const dstImage = options.dstImage ?? sourceEntry?.dstImage ?? DEFAULT_FAROS_DST_IMAGE;

  // Build airbyte-local config
  const srcConfig = buildLinearSourceConfig(config, options);
  const dstConfig = buildFarosDestinationConfig(config, options);

  const airbyteConfig: AirbyteLocalConfig = {
    src: { image: srcImage, config: srcConfig },
    dst: { image: dstImage, config: dstConfig },
  };

  const targetGraph = options.dryRun ? getStagingGraph(config) : config.graph;

  // Resolve streams
  const requestedStreams = options.streams
    ? options.streams.split(',').map(s => s.trim())
    : sourceEntry?.streams ?? ALL_LINEAR_STREAMS;

  const invalidStreams = requestedStreams.filter(s => !ALL_LINEAR_STREAMS.includes(s));
  if (invalidStreams.length > 0) {
    throw new Error(
      `Invalid stream(s): ${invalidStreams.join(', ')}. Valid streams: ${ALL_LINEAR_STREAMS.join(', ')}`
    );
  }

  const mode = options.fullRefresh ? 'full_refresh' : 'incremental';
  const connName = options.connectionName ?? sourceEntry?.connectionName ?? 'mylinearsrc';

  log.info({
    srcImage, dstImage, graph: targetGraph, origin: config.origin,
    streams: requestedStreams, mode, connectionName: connName,
    dryRun: !!options.dryRun,
  }, 'Sync plan resolved');

  // Display sync plan to console
  console.log();
  console.log(chalk.bold('Linear Sync Configuration'));
  console.log(chalk.dim('─'.repeat(40)));
  console.log(`  Source:      ${chalk.cyan(srcImage)}`);
  console.log(`  Destination: ${chalk.cyan(dstImage)}`);
  console.log(`  Graph:       ${chalk.cyan(targetGraph)}`);
  console.log(`  Origin:      ${chalk.cyan(config.origin)}`);
  console.log(`  Streams:     ${chalk.cyan(requestedStreams.join(', '))}`);
  if (options.fullRefresh) {
    console.log(`  Mode:        ${chalk.yellow('full_refresh (overwrite)')}`);
  } else {
    console.log(`  Mode:        ${chalk.green('incremental')}`);
  }
  if (options.dryRun) {
    console.log();
    ui.log.warning(`Dry-run mode: syncing to staging graph '${targetGraph}'`);
  }
  console.log(chalk.dim('─'.repeat(40)));
  console.log();

  // Write config to temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faros-linear-'));
  const configFilePath = path.join(tmpDir, 'airbyte_config.json');

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(airbyteConfig, null, 2));
    log.debug({ configFilePath }, 'Wrote airbyte config to temp file');

    // Build airbyte-local CLI arguments
    const cliArgs: string[] = ['--config-file', configFilePath];
    if (options.fullRefresh) cliArgs.push('--full-refresh');
    if (options.checkConnection) cliArgs.push('--src-check-connection');
    cliArgs.push('--connection-name', connName);
    if (options.stateFile) cliArgs.push('--state-file', options.stateFile);
    if (options.keepContainers) cliArgs.push('--keep-containers');

    const logLevel = options.logLevel ?? (options.debug ? 'debug' : config.logs?.level ?? 'info');
    cliArgs.push('--log-level', logLevel);

    if (options.rawMessages) cliArgs.push('--raw-messages');
    if (options.noSrcPull) cliArgs.push('--no-src-pull');
    if (options.noDstPull) cliArgs.push('--no-dst-pull');
    if (options.debug) cliArgs.push('--debug');

    // Resolve airbyte-local binary
    const bin = resolveAirbyteLocalBin();
    const fullArgs = [...bin.args, ...cliArgs];
    log.info({ command: bin.command, args: fullArgs }, 'Spawning airbyte-local');

    if (options.debug) {
      console.log(chalk.dim(`  Config file: ${configFilePath}`));
      console.log(chalk.dim(`  Command: ${bin.command} ${fullArgs.join(' ')}`));
      console.log();
    }

    const spinner = ui.spinner('Starting Linear sync via airbyte-local...');
    spinner.start();

    const startTime = Date.now();

    // Spawn airbyte-local
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(bin.command, fullArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let started = false;

      child.stdout?.on('data', (data: Buffer) => {
        if (!started) {
          started = true;
          spinner.succeed('Linear sync started');
          console.log();
        }
        process.stdout.write(data);
      });

      child.stderr?.on('data', (data: Buffer) => {
        if (!started) {
          started = true;
          spinner.succeed('Linear sync started');
          console.log();
        }
        process.stderr.write(data);
      });

      child.on('error', (err) => {
        spinner.fail('Failed to start airbyte-local');
        if (err.message.includes('ENOENT')) {
          reject(new Error(
            `Could not find 'airbyte-local' command. Please install it:\n` +
            `  npm install -g airbyte-local-cli\n` +
            `Or ensure it is on your PATH.`
          ));
        } else {
          reject(err);
        }
      });

      child.on('close', (code) => {
        if (!started) {
          if (code === 0) {
            spinner.succeed('Linear sync completed');
          } else {
            spinner.fail('Linear sync failed');
          }
        }
        resolve(code ?? 1);
      });
    });

    const durationMs = Date.now() - startTime;

    if (exitCode !== 0) {
      log.error({ exitCode, durationMs }, 'Sync failed');
      throw new Error(`airbyte-local exited with code ${exitCode}`);
    }

    log.info({ durationMs }, 'Sync completed successfully');
    console.log();
    ui.log.success(`Linear sync completed${options.dryRun ? ' (dry-run to staging graph)' : ''}`);

    if (options.dryRun) {
      console.log(chalk.dim(`  Graph: ${targetGraph}`));
      console.log(chalk.dim('  Run without --dry-run to sync to production'));
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    log.debug('Cleaned up temp dir');
  }
}

export function syncLinearCommand(): Command {
  const cmd = new Command('linear');

  cmd
    .description('Sync Linear data (issues, projects, teams, users, comments) to Faros via airbyte-connectors')
    .option('--linear-api-key <key>', 'Linear API key (or set LINEAR_API_KEY env var)')
    .option('--cutoff-days <days>', 'Only fetch data updated in the last N days', parseInt)
    .option('--start-date <date>', 'Start date (ISO 8601: YYYY-MM-DD)')
    .option('--end-date <date>', 'End date (ISO 8601: YYYY-MM-DD)')
    .option('--streams <streams>', `Comma-separated streams (${ALL_LINEAR_STREAMS.join(',')})`)
    .option('--full-refresh', 'Force full_refresh + overwrite mode (ignore saved state)')
    .option('--connection-name <name>', 'Connection name for state tracking', 'mylinearsrc')
    .option('--state-file <path>', 'Path to state file for incremental sync')
    .option('--check-connection', 'Validate source connection before syncing')
    .option('--src-image <image>', 'Override Linear source Docker image')
    .option('--dst-image <image>', 'Override Faros destination Docker image')
    .option('--keep-containers', 'Do not remove Docker containers after exit')
    .option('--log-level <level>', 'Log level for connectors (debug, info, warn, error)')
    .option('--raw-messages', 'Output raw Airbyte messages')
    .option('--no-src-pull', 'Skip pulling the source Docker image')
    .option('--no-dst-pull', 'Skip pulling the destination Docker image')
    .option('--dry-run', 'Sync to staging graph for verification')
    .addHelpText('after', `
Credentials (.env file or environment variables):
  LINEAR_API_KEY     Linear API key (or --linear-api-key flag)
  FAROS_API_KEY      Faros API key (or --api-key flag)

Other Environment Variables:
  FAROS_URL          Faros API URL
  FAROS_GRAPH        Target Faros graph

Config File (faros.config.yaml -- non-sensitive settings only):
  sources:
    linear:
      type: Linear
      cutoffDays: 90
      streams:
        - issues
        - projects
        - teams
        - users
        - comments

Examples:
  # Sync all Linear data using config file + env vars
  $ faros sync linear

  # Sync only issues and projects
  $ faros sync linear --streams issues,projects

  # Full refresh (ignore incremental state)
  $ faros sync linear --full-refresh

  # Check connection first, then sync
  $ faros sync linear --check-connection

  # Dry-run to staging graph
  $ faros sync linear --dry-run

  # Use a specific API key inline
  $ faros sync linear --linear-api-key lin_api_xxxxx
    `)
    .action(async (options) => {
      try {
        await syncLinear(options);
      } catch (error: any) {
        getLogger().error({ err: error }, error.message);
        ui.log.error(error.message);
        if (options.debug) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return cmd;
}
