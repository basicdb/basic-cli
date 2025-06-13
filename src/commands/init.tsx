import React from 'react';
import { render, Box, Text } from 'ink';
import { InitForm } from '../components/InitForm';
import { Spinner } from '../components/Spinner';
import { AuthService } from '../lib/auth';
import { checkForExistingConfig, readExistingConfig } from '../lib/config-templates';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';
import type { ConfigTemplate } from '../lib/types';

interface InitCommandOptions {
  new?: boolean;
  name?: string;
  ts?: boolean;
  js?: boolean;
  existing?: boolean;
  project?: string;
}

interface InitAppState {
  loading: boolean;
  error: string | null;
  success: boolean;
  result?: {
    projectId: string;
    projectName: string;
    configPath: string | null;
  };
}

function InitApp({ options }: { options: InitCommandOptions }) {
  const [state, setState] = React.useState<InitAppState>({
    loading: true,
    error: null,
    success: false
  });

  const [initialData, setInitialData] = React.useState<{
    source?: 'new' | 'existing';
    projectName?: string;
    configTemplate?: ConfigTemplate;
    projectId?: string;
  } | null>(null);

  React.useEffect(() => {
    async function initialize() {
      try {
        // Check if online
        if (!(await isOnline())) {
          setState({ loading: false, error: MESSAGES.OFFLINE, success: false });
          return;
        }

        // Check authentication
        const authService = AuthService.getInstance();
        const token = await authService.getToken();
        if (!token) {
          setState({ loading: false, error: MESSAGES.LOGGED_OUT, success: false });
          return;
        }

        // Check for existing config file
        const existingConfigPath = await checkForExistingConfig();
        if (existingConfigPath) {
          const existingConfig = await readExistingConfig();
          if (existingConfig?.projectId) {
            setState({
              loading: false,
              error: `A basic.config already exists in this directory\nProject ID: ${existingConfig.projectId}\n\nTo reinitialize, please remove the existing config file first.`,
              success: false
            });
            return;
          }
        }

        // Parse CLI options into initial data
        const parsedData = parseCliOptions(options);
        setInitialData(parsedData);
        setState({ loading: false, error: null, success: false });

      } catch (error) {
        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize',
          success: false
        });
      }
    }

    initialize();
  }, [options]);

  const handleSuccess = (result: { projectId: string; projectName: string; configPath: string | null }) => {
    setState({ loading: false, error: null, success: true, result });
    
    // Exit after showing success message
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  };

  const handleCancel = () => {
    process.exit(0);
  };

  if (state.loading) {
    return <Spinner text="Initializing..." />;
  }

  if (state.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {state.error}</Text>
        <Text color="gray">Please resolve the issue and try again.</Text>
      </Box>
    );
  }

  if (state.success && state.result) {
    return (
      <Box flexDirection="column">
        <Text color="green">✅ Project setup complete!</Text>
        <Text></Text>
        <Text>Project: {state.result.projectName}</Text>
        <Text>Project ID: {state.result.projectId}</Text>
        {state.result.configPath && (
          <Text>Config file: {state.result.configPath}</Text>
        )}
        <Text></Text>
        <Text color="gray">Visit https://docs.basic.tech for next steps.</Text>
      </Box>
    );
  }

  return (
    <InitForm
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      initialData={initialData || undefined}
    />
  );
}

function parseCliOptions(options: InitCommandOptions): {
  source?: 'new' | 'existing';
  projectName?: string;
  configTemplate?: ConfigTemplate;
  projectId?: string;
} {
  const result: {
    source?: 'new' | 'existing';
    projectName?: string;
    configTemplate?: ConfigTemplate;
    projectId?: string;
  } = {};

  // Determine source
  if (options.new) {
    result.source = 'new';
  } else if (options.existing) {
    result.source = 'existing';
  }

  // Project name
  if (options.name) {
    result.projectName = options.name;
  }

  // Project ID (for existing projects)
  if (options.project) {
    result.projectId = options.project;
    result.source = 'existing';
  }

  // Config template (priority order: specific frameworks > general > none)
  if (options.ts) {
    result.configTemplate = 'typescript';
  } else if (options.js) {
    result.configTemplate = 'javascript';
  }

  return result;
}

export interface InitCommandArgs {
  new?: boolean;
  name?: string;
  ts?: boolean;
  js?: boolean;
  existing?: boolean;
  project?: string;
}

export async function InitCommand(args: InitCommandArgs = {}): Promise<void> {
  render(<InitApp options={args} />);
}

// CLI flag examples for reference:
// basic init                                    # Interactive mode
// basic init --new                              # Skip to new project flow
// basic init --new --name "My App" --ts         # New project with TypeScript
// basic init --new --name "My App" --js         # New project with JavaScript
// basic init --existing --project "project-id"  # Import specific project
// basic init --existing --js                    # Import project with JavaScript config 