import chalk from 'chalk';
import ora, { Ora } from 'ora';
import figures from 'figures';
import boxen from 'boxen';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import ciInfo from 'ci-info';

// Detect CI environment
export const isCI = ciInfo.isCI;
export const ciName = ciInfo.name;

// Create styled logger
export const ui = {
  // Symbols
  success: chalk.green(figures.tick),
  error: chalk.red(figures.cross),
  warning: chalk.yellow(figures.warning),
  info: chalk.blue(figures.info),
  
  // Spinners
  spinner(text: string): Ora | { start: () => void; succeed: (t?: string) => void; fail: (t?: string) => void; warn: (t?: string) => void } {
    if (isCI) {
      // In CI, return a mock spinner that just logs
      return {
        start: () => console.log(text),
        succeed: (t?: string) => console.log(chalk.green(figures.tick), t || text),
        fail: (t?: string) => console.error(chalk.red(figures.cross), t || text),
        warn: (t?: string) => console.warn(chalk.yellow(figures.warning), t || text),
      };
    }
    return ora({ text, color: 'blue' });
  },
  
  // Progress bar
  progressBar(total: number, options?: Partial<cliProgress.Options>) {
    if (isCI) {
      // In CI, return a simple counter
      let current = 0;
      return {
        start: () => console.log(`Starting (0/${total})`),
        update: (value: number) => {
          current = value;
          if (value % Math.ceil(total / 10) === 0 || value === total) {
            console.log(`Progress: ${value}/${total} (${Math.round(value/total*100)}%)`);
          }
        },
        stop: () => console.log(`Completed (${current}/${total})`),
      };
    }
    
    const bar = new cliProgress.SingleBar({
      format: `${chalk.blue('Progress')} |{bar}| {percentage}% | {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      ...options,
    });
    
    return bar;
  },
  
  // Table
  table(head: string[], options?: Partial<Table.TableConstructorOptions>) {
    return new Table({
      head: head.map(h => chalk.bold(h)),
      style: { head: [] },
      ...options,
    });
  },
  
  // Box
  box(message: string, options?: any) {
    return boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      ...options,
    });
  },
  
  // Logging helpers
  log: {
    success: (message: string) => console.log(chalk.green(figures.tick), message),
    error: (message: string) => console.error(chalk.red(figures.cross), message),
    warning: (message: string) => console.warn(chalk.yellow(figures.warning), message),
    info: (message: string) => console.log(chalk.blue(figures.info), message),
    debug: (message: string) => console.log(chalk.dim(message)),
  },
};
