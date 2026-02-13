import { Command } from 'commander';
import { syncTestsCommand } from './tests';
import { syncCICDCommand } from './ci-cd';
import { syncLinearCommand } from './linear';

export function syncCommand(): Command {
  const cmd = new Command('sync');
  
  cmd
    .description('Sync data from various sources to Faros')
    .addHelpText('after', `
Available Commands:
  tests      Sync test results (JUnit/TestNG/xUnit/Cucumber/Mocha)
  ci-cd      Sync CI/CD events (builds and deployments)
  linear     Sync Linear issues, projects, teams, and users

Examples:
  $ faros sync tests test-results/*.xml --source "Jenkins"
  $ faros sync ci-cd build --status Success --commit "GitHub://org/repo/abc"
  $ faros sync linear --linear-api-key lin_api_xxx --graph default
    `);
  
  // Register subcommands
  cmd.addCommand(syncTestsCommand());
  cmd.addCommand(syncCICDCommand());
  cmd.addCommand(syncLinearCommand());
  
  return cmd;
}
