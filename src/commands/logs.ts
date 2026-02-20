import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

function getLogPath(): string {
  return path.join(process.cwd(), 'faros.log');
}

function showLastLines(filePath: string, lineCount: number): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lastLines = lines.slice(-lineCount);
  console.log(lastLines.join('\n'));
}

function tailLogFile(filePath: string): void {
  console.log(chalk.dim(`Following ${filePath}... (Ctrl+C to stop)`));
  console.log();
  
  // Show last 10 lines initially
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    showLastLines(filePath, 10);
  }
  
  let lastSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  
  const interval = setInterval(() => {
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size > lastSize) {
      const stream = fs.createReadStream(filePath, {
        start: lastSize,
        end: stats.size,
      });
      
      stream.on('data', (chunk) => {
        process.stdout.write(chunk.toString());
      });
      
      lastSize = stats.size;
    }
  }, 500);
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log();
    console.log(chalk.dim('Stopped following log file'));
    process.exit(0);
  });
}

export function logsCommand(): Command {
  const cmd = new Command('logs');
  
  cmd
    .description('View or manage CLI log file')
    .option('-f, --tail', 'Follow log file in real-time')
    .option('-n, --lines <count>', 'Show last n lines', parseInt)
    .option('--clear', 'Clear the log file')
    .option('--path', 'Show log file path')
    .addHelpText('after', `
Examples:
  $ faros logs                 # View entire log file
  $ faros logs --tail          # Follow log file in real-time
  $ faros logs --lines 100     # Show last 100 lines
  $ faros logs --clear         # Clear the log file
  $ faros logs --path          # Show log file path
`)
    .action(async (options) => {
      const logPath = getLogPath();
      
      if (options.path) {
        console.log(logPath);
        return;
      }
      
      if (options.clear) {
        if (fs.existsSync(logPath)) {
          fs.writeFileSync(logPath, '');
          console.log(chalk.green('✔'), 'Log file cleared:', chalk.dim(logPath));
        } else {
          console.log(chalk.yellow('⚠'), 'No log file found at', chalk.dim(logPath));
        }
        return;
      }
      
      if (!fs.existsSync(logPath)) {
        console.log(chalk.yellow('⚠'), 'No log file found at', chalk.dim(logPath));
        console.log();
        console.log(chalk.dim('The log file will be created on the next sync operation.'));
        return;
      }
      
      const stats = fs.statSync(logPath);
      if (stats.size === 0) {
        console.log(chalk.yellow('⚠'), 'Log file is empty:', chalk.dim(logPath));
        return;
      }
      
      if (options.tail) {
        tailLogFile(logPath);
      } else if (options.lines) {
        showLastLines(logPath, options.lines);
      } else {
        const content = fs.readFileSync(logPath, 'utf-8');
        console.log(content);
      }
    });
  
  return cmd;
}
