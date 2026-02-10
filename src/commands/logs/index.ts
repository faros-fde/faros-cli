import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { ui } from '../../lib/ui';
import { LOG_FILE_PATH } from '../../lib/logger';

// pino numeric levels -> names
const LEVEL_NAMES: Record<number, string> = {
  10: 'trace', 20: 'debug', 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal',
};

function levelName(level: any): string {
  if (typeof level === 'number') return LEVEL_NAMES[level] ?? String(level);
  return String(level);
}

function formatLevel(level: string): string {
  switch (level) {
    case 'info':  return chalk.blue('INFO ');
    case 'warn':  return chalk.yellow('WARN ');
    case 'error': return chalk.red('ERROR');
    case 'fatal': return chalk.red.bold('FATAL');
    case 'debug': return chalk.dim('DEBUG');
    case 'trace': return chalk.dim('TRACE');
    default:      return level.toUpperCase().padEnd(5);
  }
}

interface LogEntry {
  time: string;
  level: string;
  source?: string;
  msg: string;
  [key: string]: any;
}

function readLogFile(): LogEntry[] {
  if (!fs.existsSync(LOG_FILE_PATH)) return [];

  const lines = fs.readFileSync(LOG_FILE_PATH, 'utf-8').split('\n').filter(Boolean);
  const entries: LogEntry[] = [];
  for (const line of lines) {
    try {
      const raw = JSON.parse(line);
      entries.push({
        time: raw.time ?? raw.timestamp ?? '',
        level: levelName(raw.level),
        source: raw.source,
        msg: raw.msg ?? raw.message ?? '',
        ...raw,
      });
    } catch { /* skip malformed lines */ }
  }
  return entries;
}

async function viewLogs(options: any): Promise<void> {
  let entries = readLogFile();

  if (entries.length === 0) {
    ui.log.info('No logs found');
    console.log(chalk.dim(`Log file: ${LOG_FILE_PATH}`));
    return;
  }

  if (options.level) {
    entries = entries.filter(e => e.level === options.level.toLowerCase());
  }
  if (options.since) {
    const t = new Date(options.since).getTime();
    entries = entries.filter(e => new Date(e.time).getTime() >= t);
  }
  if (options.until) {
    const t = new Date(options.until).getTime();
    entries = entries.filter(e => new Date(e.time).getTime() <= t);
  }

  // Tail: show last N entries (default 50)
  const tail = parseInt(options.tail, 10) || 50;
  entries = entries.slice(-tail);

  console.log(chalk.bold(`\nLogs (${entries.length} entries) — ${LOG_FILE_PATH}\n`));

  for (const e of entries) {
    const ts = chalk.dim(e.time);
    const lvl = formatLevel(e.level);
    const src = e.source ? chalk.cyan(`[${e.source}]`) + ' ' : '';
    console.log(`${ts}  ${lvl}  ${src}${e.msg}`);
  }

  console.log();
}

export function logsCommand(): Command {
  const cmd = new Command('logs');

  cmd
    .description('View faros.log in the current directory')
    .option('--level <level>', 'Filter by level (debug, info, warn, error)')
    .option('--since <time>', 'Show entries since (ISO-8601)')
    .option('--until <time>', 'Show entries until (ISO-8601)')
    .option('--tail <n>', 'Show last N entries', '50')
    .addHelpText('after', `
Examples:
  $ faros logs
  $ faros logs --level error
  $ faros logs --tail 20
  $ faros logs --since "2025-01-01"
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
