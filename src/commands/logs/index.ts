import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ui } from '../../lib/ui';

interface LogEntry {
  timestamp: string;
  level: string;
  source?: string;
  message: string;
}

function getLogsDirectory(): string {
  return path.join(os.homedir(), '.faros', 'logs');
}

function readLogs(options: any): LogEntry[] {
  const logsDir = getLogsDirectory();
  
  if (!fs.existsSync(logsDir)) {
    return [];
  }
  
  const logFiles = fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.log'))
    .sort()
    .reverse();
  
  const logs: LogEntry[] = [];
  
  for (const file of logFiles.slice(0, 10)) { // Last 10 log files
    const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        logs.push({
          timestamp: entry.time || entry.timestamp,
          level: entry.level,
          source: entry.source,
          message: entry.msg || entry.message,
        });
      } catch {
        // Skip invalid lines
      }
    }
  }
  
  return logs;
}

function formatLogLevel(level: string): string {
  switch (level.toLowerCase()) {
    case 'info':
      return chalk.blue('INFO');
    case 'warn':
    case 'warning':
      return chalk.yellow('WARN');
    case 'error':
      return chalk.red('ERROR');
    case 'debug':
      return chalk.dim('DEBUG');
    default:
      return level.toUpperCase();
  }
}

async function viewLogs(options: any): Promise<void> {
  const logs = readLogs(options);
  
  if (logs.length === 0) {
    ui.log.info('No logs found');
    console.log(chalk.dim('Logs are stored in: ' + getLogsDirectory()));
    return;
  }
  
  // Filter by level
  let filteredLogs = logs;
  if (options.level) {
    filteredLogs = logs.filter(l => l.level === options.level);
  }
  
  // Filter by time range
  if (options.since) {
    const sinceTime = new Date(options.since).getTime();
    filteredLogs = filteredLogs.filter(l => new Date(l.timestamp).getTime() >= sinceTime);
  }
  
  if (options.until) {
    const untilTime = new Date(options.until).getTime();
    filteredLogs = filteredLogs.filter(l => new Date(l.timestamp).getTime() <= untilTime);
  }
  
  // Output to file if requested
  if (options.outFile) {
    fs.writeFileSync(options.outFile, JSON.stringify(filteredLogs, null, 2));
    ui.log.success(`Exported ${filteredLogs.length} log entries to ${options.outFile}`);
    return;
  }
  
  // Display logs
  console.log(chalk.bold(`\nRecent Logs (${filteredLogs.length} entries):\n`));
  
  const displayLogs = filteredLogs.slice(0, 100); // Limit to 100 for display
  
  for (const log of displayLogs) {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = formatLogLevel(log.level);
    const source = log.source ? chalk.cyan(`[${log.source}]`) : '';
    
    console.log(`${chalk.dim(timestamp)}  ${level}  ${source} ${log.message}`);
  }
  
  if (filteredLogs.length > 100) {
    console.log(chalk.dim(`\n... and ${filteredLogs.length - 100} more entries`));
    console.log(chalk.dim('Use --out-file to export all logs'));
  }
}

export function logsCommand(): Command {
  const cmd = new Command('logs');
  
  cmd
    .description('View sync logs and debug information')
    .option('--level <level>', 'Filter by log level (info, warn, error, debug)')
    .option('--since <time>', 'Show logs since time (ISO-8601)')
    .option('--until <time>', 'Show logs until time (ISO-8601)')
    .option('--out-file <path>', 'Export logs to file')
    .option('--follow', 'Follow logs in real-time (not yet implemented)')
    .addHelpText('after', `
Examples:
  $ faros logs
  $ faros logs --level error
  $ faros logs --since "2024-01-15T10:00:00Z"
  $ faros logs --out-file sync-logs.json
    `)
    .action(async (options) => {
      try {
        await viewLogs(options);
      } catch (error: any) {
        ui.log.error(error.message);
        process.exit(1);
      }
    });
  
  return cmd;
}
