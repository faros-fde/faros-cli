import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../../config/loader';
import { ui } from '../../lib/ui';

interface Source {
  name: string;
  type: string;
  status: 'active' | 'warning' | 'error';
  lastSync?: string;
}

async function listSources(): Promise<void> {
  const config = await loadConfig();
  
  if (!config || !config.sources || Object.keys(config.sources).length === 0) {
    ui.log.info('No sources configured');
    console.log();
    console.log(chalk.dim('Configure sources in faros.config.yaml or use:'));
    console.log(chalk.dim('  faros config init'));
    return;
  }
  
  console.log(chalk.bold('\nConfigured Sources:\n'));
  
  const table = ui.table(['Source', 'Type', 'Status', 'Config']);
  
  for (const [name, sourceConfig] of Object.entries(config.sources)) {
    const type = sourceConfig.type || 'Unknown';
    const hasAuth = sourceConfig.apiKey || sourceConfig.token ? ui.success : chalk.yellow('⚠');
    const status = sourceConfig.apiKey || sourceConfig.token ? 'Configured' : 'Missing credentials';
    
    table.push([
      name,
      type,
      hasAuth,
      status
    ]);
  }
  
  console.log(table.toString());
  console.log();
  console.log(chalk.dim('Run \'faros sources get <name>\' for details'));
}

async function getSource(name: string): Promise<void> {
  const config = await loadConfig();
  
  if (!config || !config.sources || !config.sources[name]) {
    ui.log.error(`Source '${name}' not found`);
    console.log(chalk.dim('Run \'faros sources list\' to see all sources'));
    process.exit(1);
  }
  
  const source = config.sources[name];
  
  console.log(chalk.bold(`\nSource: ${name}\n`));
  console.log(`Type: ${source.type || 'Unknown'}`);
  
  if (source.apiKey) {
    console.log(`API Key: ${source.apiKey.substring(0, 10)}***`);
  }
  if (source.token) {
    console.log(`Token: ${source.token.substring(0, 10)}***`);
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
