import { Command, Option } from 'commander';
import { parse } from 'test-results-parser';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import chalk from 'chalk';
import { loadConfig, mergeConfig } from '../../config/loader';
import { createClient, sendEvent } from '../../lib/api/client';
import { ui } from '../../lib/ui';
import { SyncTestsOptions } from '../../types/config';

enum TestResultsFormat {
  Cucumber = 'cucumber',
  JUnit = 'junit',
  Mocha = 'mocha',
  TestNG = 'testng',
  xUnit = 'xunit',
}

enum TestType {
  Functional = 'Functional',
  Integration = 'Integration',
  Manual = 'Manual',
  Performance = 'Performance',
  Regression = 'Regression',
  Security = 'Security',
  Unit = 'Unit',
  Custom = 'Custom',
}

function convertStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'success':
    case 'succeed':
    case 'succeeded':
    case 'pass':
    case 'passed':
      return 'Success';
    case 'skip':
    case 'skipped':
    case 'disable':
    case 'disabled':
      return 'Skipped';
    case 'fail':
    case 'failed':
    case 'failure':
      return 'Failure';
    default:
      return 'Custom';
  }
}

function parseTime(time: string): string {
  if (time.toLowerCase() === 'now') {
    return new Date().toISOString();
  }
  if (/^\d+$/.test(time)) {
    return new Date(parseInt(time, 10)).toISOString();
  }
  return time;
}

async function processTestResults(
  paths: string[],
  options: SyncTestsOptions
): Promise<void> {
  const fileConfig = await loadConfig();
  const config = mergeConfig(fileConfig, options);
  
  // Local files only
  const files = paths.flatMap(p => p.split(',').map(v => v.trim()));
  
  // Parse test results
    const parseSpinner = ui.spinner('Parsing test results...');
    parseSpinner.start();
    
    const results = parse({
      type: options.format as any || 'junit',
      files,
    });
    
    parseSpinner.succeed(
      `Parsed ${results.suites.length} test suite(s) with ${results.total} total test(s)`
    );
    
    // Validation mode
    if (options.validate) {
      ui.log.success('All data is valid');
      console.log();
      console.log(chalk.dim('Would create:'));
      console.log(chalk.dim(`  • ${results.suites.length} qa_TestExecution records`));
      console.log(chalk.dim(`  • ${results.total} qa_TestCase records`));
      console.log(chalk.dim(`  • ${results.total} qa_TestCaseResult records`));
      console.log();
      console.log(chalk.dim('Run without --validate to sync to Faros'));
      return;
    }
    
    // Preview mode
    if (options.preview) {
      console.log();
      console.log(chalk.bold('Sample records (first 2):'));
      console.log();
      
      const sampleSuite = results.suites[0];
      if (sampleSuite) {
        console.log(chalk.blue('qa_TestExecution:'));
        console.log('  {');
        console.log(`    "suite": "${sampleSuite.name}",`);
        console.log(`    "source": "${options.source}",`);
        console.log(`    "type": "${options.type || 'Unit'}",`);
        console.log(`    "status": "${convertStatus(sampleSuite.status)}",`);
        console.log(`    "stats": { "passed": ${sampleSuite.passed}, "failed": ${sampleSuite.failed}, "total": ${sampleSuite.total} }`);
        console.log('  }');
        console.log();
        
        const sampleCase = sampleSuite.cases[0];
        if (sampleCase) {
          console.log(chalk.blue('qa_TestCase:'));
          console.log('  {');
          console.log(`    "name": "${sampleCase.name}",`);
          console.log(`    "type": "${options.type || 'Unit'}",`);
          console.log(`    "status": "${convertStatus(sampleCase.status)}"`);
          console.log('  }');
        }
      }
      
      console.log();
      console.log(chalk.dim('To sync to production, run without --validate flag'));
      return;
    }
    
    // Create API client
    const client = createClient(config);
    
    // Upload test results
    const progressBar = ui.progressBar(results.suites.length, {
      format: `${chalk.blue('Uploading')} |{bar}| {percentage}% | {value}/{total} suites`,
    });
    
    progressBar.start(results.suites.length, 0);
    
    const targetGraph = config.graph;
    
    const limit = pLimit(options.concurrency || config.defaults?.concurrency || 8);
    const errors: Array<{ suite: string; error: string }> = [];
    let uploaded = 0;
    
    const uploadPromises = results.suites.map(suite =>
      limit(async () => {
        try {
          const cases = suite.cases.map(tc => {
            const steps = tc.steps.map(s => ({
              id: uuidv4(),
              name: s.name,
              status: convertStatus(s.status),
              statusDetails:
                s.failure && s.stack_trace
                  ? `${s.failure} : ${s.stack_trace}`
                  : s.failure ?? s.stack_trace,
            }));
            
            return {
              id: uuidv4(),
              name: tc.name,
              type: options.type || 'Unit',
              status: convertStatus(tc.status),
              statusDetails:
                tc.failure && tc.stack_trace
                  ? `${tc.failure} : ${tc.stack_trace}`
                  : tc.failure ?? tc.stack_trace,
              ...(steps.length > 0 ? { step: steps } : {}),
            };
          });
          
          const data = {
            type: 'TestExecution',
            version: '0.0.1',
            origin: config.origin,
            data: {
              commit: options.commit ? { uri: options.commit } : undefined,
              test: {
                id: uuidv4(),
                suite: suite.name,
                source: options.source || config.defaults?.testSource || 'Unknown',
                type: options.type || config.defaults?.testType || 'Unit',
                status: convertStatus(suite.status),
                statusDetails: suite.status,
                stats: {
                  success: suite.passed,
                  failure: suite.failed,
                  skipped: suite.skipped,
                  unknown: 0,
                  custom: 0,
                  total: suite.total,
                },
                startTime: (suite as any).timestamp || parseTime(options.testStart || 'now'),
                endTime: (suite as any).timestamp
                  ? new Date(Date.parse((suite as any).timestamp) + suite.duration).toISOString()
                  : parseTime(options.testEnd || 'now'),
                ...(cases.length > 0 ? { case: cases } : {}),
              },
            },
          };
          
          await sendEvent(client, targetGraph, data);
          uploaded++;
          progressBar.update(uploaded);
        } catch (error: any) {
          errors.push({
            suite: suite.name,
            error: error.message,
          });
        }
      })
    );
    
    await Promise.all(uploadPromises);
    progressBar.stop();
    
    console.log();
    
    if (errors.length > 0) {
      ui.log.error(`Failed to upload ${errors.length} test suite(s)`);
      errors.slice(0, 5).forEach(e => {
        console.error(chalk.dim(`  ${e.suite}: ${e.error}`));
      });
      if (errors.length > 5) {
        console.error(chalk.dim(`  ... and ${errors.length - 5} more`));
      }
      process.exit(1);
    }
    
    ui.log.success(`Synced ${uploaded} test suite(s)`);
    
    console.log(chalk.dim(`  Graph: ${targetGraph}`));
    console.log(chalk.dim(`  View in Faros: ${config.url.replace('/api', '')}/${targetGraph}/qa`));
}

export function syncTestsCommand(): Command {
  const cmd = new Command('tests');
  
  cmd
    .description('Sync test results (JUnit/TestNG/xUnit/Cucumber/Mocha) to Faros')
    .argument('<paths...>', 'Path(s) to test result files')
    .addOption(
      new Option('--format <format>', 'Test results format')
        .choices(Object.values(TestResultsFormat))
        .default('junit')
    )
    .addOption(
      new Option('--type <type>', 'Test type')
        .choices(Object.values(TestType))
        .default('Unit')
    )
    .option('--source <source>', 'Test source system (e.g. Jenkins, GitHub-Actions)')
    .option('--commit <uri>', 'Commit URI: <source>://<org>/<repo>/<sha>')
    .option('--test-start <time>', 'Test start time (ISO-8601, epoch millis, or "Now")', 'now')
    .option('--test-end <time>', 'Test end time (ISO-8601, epoch millis, or "Now")', 'now')
    .option('--concurrency <number>', 'Number of concurrent uploads', parseInt, 8)
    .option('--validate', 'Validate only, don\'t send to Faros (fast, offline)')
    .option('--preview', 'Show sample records without sending')
    .addHelpText('after', `
Examples:
  # Sync local test results
  $ faros sync tests test-results/*.xml --source "Jenkins" --commit "GitHub://org/repo/abc"
  
  # Validate before syncing
  $ faros sync tests *.xml --validate
    `)
    .action(async (paths, options) => {
      try {
        await processTestResults(paths, options);
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
