#!/usr/bin/env node

import { program } from 'commander';
import { CONSTANTS, MESSAGES } from './lib/constants.js';
import { getVersion } from './lib/version.js';
import { formatError, handleError } from './lib/errors.js';
import { findSimilarCommands } from './lib/platform.js';

// Set up global error handlers
process.on('uncaughtException', (error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nOperation cancelled');
  process.exit(0);
});

// Configure the CLI
program
  .name('basic')
  .description('Basic CLI for creating & managing your projects')
  .version(getVersion());

// Login command
program
  .command('login')
  .description('Login to your Basic account')
  .action(async () => {
    try {
      const { LoginCommand } = await import('./commands/login.js');
      await LoginCommand();
      process.exit(0);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Logout command
program
  .command('logout')
  .description('Logout from your Basic account')
  .action(async () => {
    try {
      const { LogoutCommand } = await import('./commands/logout.js');
      await LogoutCommand();
      process.exit(0);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Account command
program
  .command('account')
  .description('Show account information')
  .action(async () => {
    try {
      const { AccountCommand } = await import('./commands/account.js');
      await AccountCommand();
      process.exit(0);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Version command (override default to show update info)
program
  .command('version')
  .description('Show CLI version')
  .action(async () => {
    try {
      const { VersionCommand } = await import('./commands/version.js');
      await VersionCommand();
      process.exit(0);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Update command
program
  .command('update')
  .description('Update CLI to the latest version')
  .action(async () => {
    try {
      const { UpdateCommand } = await import('./commands/update.js');
      await UpdateCommand();
      process.exit(0);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    program.help();
  });

// Debug command
program
  .command('debug')
  .description('Show Basic config directory location')
  .action(async () => {
    try {
      const { DebugCommand } = await import('./commands/debug.js');
      await DebugCommand();
      process.exit(0);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Projects command
program
  .command('projects')
  .description('List and browse your projects')
  .action(async () => {
    try {
      const { ProjectsCommand } = await import('./commands/projects.js');
      await ProjectsCommand();
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Teams command
program
  .command('teams')
  .argument('[action]', 'Teams action (new)', 'list')
  .description('List teams or create a new team')
  .action(async (action?: string) => {
    try {
      const { TeamsCommand } = await import('./commands/teams.js');
      await TeamsCommand(action);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show project status')
  .action(async () => {
    try {
      const { StatusCommand } = await import('./commands/status.js');
      await StatusCommand();
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Pull command
program
  .command('pull')
  .description('Pull schema from remote')
  .action(async () => {
    try {
      const { PullCommand } = await import('./commands/pull.js');
      await PullCommand();
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Push command
program
  .command('push')
  .description('Push schema to remote')
  .action(async () => {
    try {
      const { PushCommand } = await import('./commands/push.js');
      await PushCommand();
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Create a new project or import an existing project')
  .option('--new', 'Create a new project (skip project type selection)')
  .option('--existing', 'Import an existing project')
  .option('--name <name>', 'Project name for new projects')
  .option('--project <id>', 'Project ID for existing projects')
  .option('--ts', 'Use TypeScript configuration template')
  .option('--js', 'Use JavaScript configuration template')
  .action(async (options) => {
    try {
      const { InitCommand } = await import('./commands/init.js');
      await InitCommand(options);
    } catch (error) {
      const cliError = handleError(error);
      console.error(formatError(cliError));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  const unknownCommand = operands[0];
  const suggestions = findSimilarCommands(unknownCommand);
  
  console.error(`Unknown command: ${unknownCommand}\n`);
  
  if (suggestions.length > 0) {
    console.error('Did you mean:');
    suggestions.forEach(suggestion => {
      console.error(`  - ${suggestion}`);
    });
    console.error('');
  }
  
  console.error("Use 'basic help' to see all commands.");
  process.exit(1);
});

// Show welcome message if no command provided
if (process.argv.length <= 2) {
  console.log(MESSAGES.WELCOME);
  process.exit(0);
}

// Parse command line arguments
program.parse(); 