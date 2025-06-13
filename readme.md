# Basic CLI

A command-line interface for interacting with the Basic API, built with TypeScript and React Ink.

## Installation

```bash
npm install -g @basictech/cli
```

## Quick Start

```bash
# Login to your Basic account
basic login

# Create a new project
basic init --new --name "My Project" --ts

# Check project status
basic status

# Push schema changes
basic push

# Pull latest schema
basic pull
```

## Available Commands

### Authentication
- `basic login` - Login to your Basic account
- `basic logout` - Logout from your Basic account  
- `basic account` - Show account information

### Project Management
- `basic init` - Create a new project or import existing project
- `basic projects` - List your projects
- `basic teams` - List teams or create new teams
- `basic status` - Show schema status in current project
- `basic push` - Push schema changes to remote
- `basic pull` - Pull schema from remote

### Utility
- `basic version` - Show CLI version and check for updates
- `basic update` - Update CLI to the latest version
- `basic help` - Show help information
- `basic debug` - Show Basic config directory location

## Init Command Options

The `basic init` command supports several options for automation:

```bash
# Interactive mode (default)
basic init

# Create new project (skip project type selection)
basic init --new --name "My Project" --ts

# Import existing project
basic init --existing --project "project-id"

# Use JavaScript config
basic init --new --name "My Project" --js
```

## Authentication

Before using commands that require authentication, make sure you're logged in:

```bash
basic login
```

This will open your browser and guide you through the OAuth flow.

## Project Workflow

1. **Initialize**: `basic init` to create or import a project
2. **Develop**: Modify your `basic.config.ts/js` file
3. **Check Status**: `basic status` to see changes
4. **Push Changes**: `basic push` to publish your schema
5. **Pull Updates**: `basic pull` to get latest remote changes

## Schema Management

The CLI automatically manages your schema versioning:

- **Push**: Increments version and uploads changes
- **Pull**: Downloads latest schema and updates local files
- **Status**: Shows version differences and conflicts
- **Init**: Automatically pulls latest schema when setting up projects

## Documentation

- [Basic Documentation](https://docs.basic.tech)
- [CLI Documentation](https://docs.basic.tech/get-started/cli)

## Contributing

This CLI is built with:
- **TypeScript** for type safety
- **React Ink** for interactive UI components  
- **Commander.js** for CLI argument parsing
- **Vitest** for testing

## Support

If you encounter issues or have questions:
- Visit [Basic Documentation](https://docs.basic.tech)
- Check the [CLI Documentation](https://docs.basic.tech/get-started/cli)
- Use `basic help` for command-specific help

## License

MIT
