import { Command } from 'commander';
import { syncTestsCommand } from './tests';
import { syncCICDCommand } from './ci-cd';

export function syncCommand(): Command {
  const cmd = new Command('sync');
  
  cmd
    .description('Sync data from various sources to Faros')
    .addHelpText('after', `
Available Commands:
  tests      Sync test results (JUnit/TestNG/xUnit/Cucumber/Mocha)
  ci-cd      Sync CI/CD events (builds and deployments)

Examples:
  $ faros sync tests test-results/*.xml --source "Jenkins"
  $ faros sync ci-cd build --status Success --commit "GitHub://org/repo/abc"
    `);
  
  // Register subcommands
  cmd.addCommand(syncTestsCommand());
  cmd.addCommand(syncCICDCommand());
  
  return cmd;
}
