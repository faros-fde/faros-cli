import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, mergeConfig } from '../../config/loader';
import { ui } from '../../lib/ui';

// Map source names to the env var that provides their credential
const SOURCE_CREDENTIAL_ENV: Record<string, string> = {
  linear: 'LINEAR_API_KEY',
  github: 'GITHUB_TOKEN',
};

function hasCredential(sourceName: string): boolean {
  const envVar = SOURCE_CREDENTIAL_ENV[sourceName];
  return envVar ? !!process.env[envVar] : false;
}

function maskCredential(value: string): string {
  if (value.length <= 6) return '***';
  return `${value.substring(0, 6)}***`;
}

async function listSources(): Promise<void> {
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, {});
  
  if (!config || !config.sources || Object.keys(config.sources).length === 0) {
    ui.log.info('No sources configured');
    console.log();
    console.log(chalk.dim('Configure sources in faros.config.yaml or use:'));
    console.log(chalk.dim('  faros config init'));
    return;
  }
  
  console.log(chalk.bold('\nConfigured Sources:\n'));
  
  const table = ui.table(['Source', 'Type', 'Credentials', 'Status']);
  
  for (const [name, sourceConfig] of Object.entries(config.sources)) {
    const type = sourceConfig.type || 'Unknown';
    const envVar = SOURCE_CREDENTIAL_ENV[name];
    const hasCred = hasCredential(name);
    const credIcon = hasCred ? ui.success : chalk.yellow('⚠');
    const status = hasCred
      ? `${envVar} set`
      : envVar ? `Set ${envVar} in .env` : 'N/A';
    
    table.push([
      name,
      type,
      credIcon,
      status,
    ]);
  }
  
  console.log(table.toString());
  console.log();
  console.log(chalk.dim('Credentials are read from environment variables / .env file'));
  console.log(chalk.dim('Run \'faros sources get <name>\' for details'));
}

async function getSource(name: string): Promise<void> {
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, {});
  
  if (!config || !config.sources || !config.sources[name]) {
    ui.log.error(`Source '${name}' not found`);
    console.log(chalk.dim('Run \'faros sources list\' to see all sources'));
    process.exit(1);
  }
  
  const source = config.sources[name];
  
  console.log(chalk.bold(`\nSource: ${name}\n`));
  console.log(`Type: ${source.type || 'Unknown'}`);
  
  // Show credential status from env vars
  const envVar = SOURCE_CREDENTIAL_ENV[name];
  if (envVar) {
    const value = process.env[envVar];
    if (value) {
      console.log(`Credential: ${envVar} = ${maskCredential(value)}`);
    } else {
      console.log(chalk.yellow(`Credential: ${envVar} not set (add to .env file)`));
    }
  }
  
  if (source.syncInterval) {
    console.log(`Sync Interval: ${source.syncInterval}`);
  }
  
  if (source.streams && source.streams.length > 0) {
    console.log(`Streams: ${source.streams.join(', ')}`);
  }
  
  console.log();
}

export function sourcesCommand(): Command {
  const cmd = new Command('sources');
  
  cmd
    .description('Manage data sources')
    .addHelpText('after', `
Examples:
  $ faros sources list
  $ faros sources get linear
    `);
  
  // List subcommand
  const listCmd = new Command('list')
    .description('List all configured sources')
    .action(async () => {
      try {
        await listSources();
      } catch (error: any) {
        ui.log.error(error.message);
        process.exit(1);
      }
    });
  
  // Get subcommand
  const getCmd = new Command('get')
    .description('Get details for a specific source')
    .argument('<name>', 'Source name')
    .action(async (name) => {
      try {
        await getSource(name);
      } catch (error: any) {
        ui.log.error(error.message);
        process.exit(1);
      }
    });
  
  cmd.addCommand(listCmd);
  cmd.addCommand(getCmd);
  
  return cmd;
}
