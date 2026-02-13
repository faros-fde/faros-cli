import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, mergeConfig, getStagingGraph } from '../../config/loader';
import { createClient, sendEvent } from '../../lib/api/client';
import { ui } from '../../lib/ui';
import { SyncCICDOptions } from '../../types/config';

function parseTime(time: string): string {
  if (time.toLowerCase() === 'now') {
    return new Date().toISOString();
  }
  if (/^\d+$/.test(time)) {
    return new Date(parseInt(time, 10)).toISOString();
  }
  return time;
}

async function syncBuildStatus(options: SyncCICDOptions): Promise<void> {
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, options);
  
  if (!options.commit && !options.run) {
    throw new Error('Either --commit or --run is required');
  }
  
  const targetGraph = options.dryRun ? getStagingGraph(config) : config.graph;
  
  if (options.dryRun) {
    ui.log.warning(`Dry-run mode: syncing to staging graph '${targetGraph}'`);
    console.log();
  }
  
  const data: any = {
    type: 'CI',
    version: '0.0.1',
    origin: config.origin,
    data: {},
  };
  
  if (options.commit) {
    data.data.commit = { uri: options.commit };
  }
  
  if (options.artifact) {
    data.data.artifact = { uri: options.artifact };
  }
  
  if (options.run) {
    const run: any = { uri: options.run };
    if (options.runStatus) run.status = { category: options.runStatus };
    if (options.runStartTime) run.startedAt = parseTime(options.runStartTime);
    if (options.runEndTime) run.endedAt = parseTime(options.runEndTime);
    data.data.run = run;
  }
  
  const spinner = ui.spinner('Reporting build status...');
  spinner.start();
  
  const client = createClient(config);
  await sendEvent(client, targetGraph, data);
  
  spinner.succeed('Build status reported');
  
  if (options.dryRun) {
    console.log(chalk.dim(`  Graph: ${targetGraph}`));
    console.log(chalk.dim('  Run without --dry-run to sync to production'));
  }
}

async function syncDeployStatus(options: SyncCICDOptions): Promise<void> {
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, options);
  
  if (!options.deploy) {
    throw new Error('--deploy is required for deployment events');
  }
  
  if (!options.commit && !options.artifact) {
    throw new Error('Either --commit or --artifact is required');
  }
  
  const targetGraph = options.dryRun ? getStagingGraph(config) : config.graph;
  
  if (options.dryRun) {
    ui.log.warning(`Dry-run mode: syncing to staging graph '${targetGraph}'`);
    console.log();
  }
  
  const data: any = {
    type: 'CD',
    version: '0.0.1',
    origin: config.origin,
    data: {
      deploy: { uri: options.deploy },
    },
  };
  
  if (options.commit) {
    data.data.commit = { uri: options.commit };
  } else if (options.artifact) {
    data.data.artifact = { uri: options.artifact };
  }
  
  const deploy: any = data.data.deploy;
  if (options.deployStatus) deploy.status = { category: options.deployStatus };
  if (options.deployStartTime) deploy.startedAt = parseTime(options.deployStartTime);
  if (options.deployEndTime) deploy.endedAt = parseTime(options.deployEndTime);
  
  if (options.run) {
    const run: any = { uri: options.run };
    if (options.runStatus) run.status = { category: options.runStatus };
    if (options.runStartTime) run.startedAt = parseTime(options.runStartTime);
    if (options.runEndTime) run.endedAt = parseTime(options.runEndTime);
    data.data.run = run;
  }
  
  const spinner = ui.spinner('Reporting deployment...');
  spinner.start();
  
  const client = createClient(config);
  await sendEvent(client, targetGraph, data);
  
  spinner.succeed('Deployment reported');
  
  if (options.dryRun) {
    console.log(chalk.dim(`  Graph: ${targetGraph}`));
    console.log(chalk.dim('  Run without --dry-run to sync to production'));
  }
}

export function syncCICDCommand(): Command {
  const cmd = new Command('ci-cd');
  
  cmd.description('Sync CI/CD events (builds and deployments) to Faros');
  
  // Build subcommand
  const buildCmd = new Command('build')
    .description('Report build status')
    .option('--status <status>', 'Build status')
    .option('--commit <uri>', 'Commit URI')
    .option('--run <uri>', 'Run URI')
    .option('--run-status <status>', 'Run status')
    .option('--run-start-time <time>', 'Run start time')
    .option('--run-end-time <time>', 'Run end time')
    .option('--artifact <uri>', 'Artifact URI')
    .option('--dry-run', 'Sync to staging graph')
    .action(async (options) => {
      try {
        await syncBuildStatus({ ...options, runStatus: options.status || options.runStatus });
      } catch (error: any) {
        ui.log.error(error.message);
        process.exit(1);
      }
    });
  
  // Deploy subcommand
  const deployCmd = new Command('deploy')
    .description('Report deployment status')
    .option('--status <status>', 'Deploy status')
    .option('--commit <uri>', 'Commit URI')
    .option('--deploy <uri>', 'Deploy URI (required)')
    .option('--deploy-status <status>', 'Deploy status')
    .option('--deploy-start-time <time>', 'Deploy start time')
    .option('--deploy-end-time <time>', 'Deploy end time')
    .option('--artifact <uri>', 'Artifact URI')
    .option('--run <uri>', 'Run URI')
    .option('--run-status <status>', 'Run status')
    .option('--run-start-time <time>', 'Run start time')
    .option('--run-end-time <time>', 'Run end time')
    .option('--dry-run', 'Sync to staging graph')
    .action(async (options) => {
      try {
        await syncDeployStatus({ ...options, deployStatus: options.status || options.deployStatus });
      } catch (error: any) {
        ui.log.error(error.message);
        process.exit(1);
      }
    });
  
  cmd.addCommand(buildCmd);
  cmd.addCommand(deployCmd);
  
  return cmd;
}
