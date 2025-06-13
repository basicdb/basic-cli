import React from 'react';
import { render, Box, Text, useInput } from 'ink';
import { Spinner } from '../components/Spinner';
import { ApiClient } from '../lib/api';
import { AuthService } from '../lib/auth';
import { readSchemaFromConfig, compareVersions, saveSchemaToConfig } from '../lib/schema';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';
import type { Schema } from '../lib/types';

interface PullState {
  phase: 'checking' | 'confirming' | 'pulling' | 'success' | 'error' | 'no-action';
  error: string | null;
  statusResult?: {
    status: 'current' | 'behind' | 'ahead' | 'conflict' | 'invalid' | 'no-schema';
    projectId: string;
    localVersion: number;
    remoteVersion: number;
    message: string[];
    needsConfirmation: boolean;
    confirmationTitle: string;
    confirmationMessage: string;
  };
  pullResult?: {
    projectId: string;
    oldVersion: number;
    newVersion: number;
    filePath: string;
  };
}

function PullApp() {
  const [state, setState] = React.useState<PullState>({
    phase: 'checking',
    error: null
  });

  const [selectedOption, setSelectedOption] = React.useState<'yes' | 'no'>('yes');

  React.useEffect(() => {
    async function checkPullStatus() {
      try {
        // Check if online
        if (!(await isOnline())) {
          setState({
            phase: 'error',
            error: MESSAGES.OFFLINE,
          });
          return;
        }

        // Check authentication
        const authService = AuthService.getInstance();
        const token = await authService.getToken();
        if (!token) {
          setState({
            phase: 'error',
            error: MESSAGES.LOGGED_OUT,
          });
          return;
        }

        // Read local schema
        const localConfig = await readSchemaFromConfig();
        if (!localConfig) {
          setState({
            phase: 'no-action',
            error: null,
            statusResult: {
              status: 'no-schema',
              projectId: '',
              localVersion: 0,
              remoteVersion: 0,
              message: [
                'No schema found in config files',
                'Run \'basic init\' to create a new project or import an existing project'
              ],
              needsConfirmation: false,
              confirmationTitle: '',
              confirmationMessage: ''
            }
          });
          return;
        }

        // Get remote schema
        const apiClient = ApiClient.getInstance();
        let remoteSchema: Schema | null = null;
        
        try {
          remoteSchema = await apiClient.getProjectSchema(localConfig.projectId);
        } catch (error) {
          setState({
            phase: 'error',
            error: `Error fetching remote schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          return;
        }

        // Create empty schema if none exists remotely
        if (!remoteSchema) {
          remoteSchema = {
            project_id: localConfig.projectId,
            version: 0,
            tables: {}
          };
        }

        // Compare versions and determine action
        const comparison = compareVersions(localConfig.schema, remoteSchema);
        const result = await analyzePullAction(localConfig, remoteSchema, comparison, apiClient);
        
        setState({
          phase: result.needsConfirmation ? 'confirming' : 'no-action',
          error: null,
          statusResult: result
        });

      } catch (error) {
        setState({
          phase: 'error',
          error: error instanceof Error ? error.message : 'Failed to check pull status'
        });
      }
    }

    checkPullStatus();
  }, []);

  // Handle confirmation input (only for interactive states)
  useInput((input, key) => {
    if (state.phase === 'confirming') {
      if (key.upArrow || key.downArrow) {
        setSelectedOption(prev => prev === 'yes' ? 'no' : 'yes');
      } else if (key.return) {
        if (selectedOption === 'yes') {
          handlePull();
        } else {
          setState(prev => ({ ...prev, phase: 'no-action' }));
        }
      } else if (key.escape || input === 'q') {
        setState(prev => ({ ...prev, phase: 'no-action' }));
      }
    }
  });

  const handlePull = async () => {
    setState(prev => ({ ...prev, phase: 'pulling' }));

    try {
      if (!state.statusResult) {
        throw new Error('No status result available');
      }

      // Re-fetch the latest data for pulling
      const localConfig = await readSchemaFromConfig();
      if (!localConfig) {
        throw new Error('Local schema not found');
      }

      const apiClient = ApiClient.getInstance();
      const remoteSchema = await apiClient.getProjectSchema(localConfig.projectId);
      
      if (!remoteSchema) {
        throw new Error('Remote schema not found');
      }

      // Save the remote schema to local config
      const filePath = await saveSchemaToConfig(remoteSchema);

      setState({
        phase: 'success',
        error: null,
        pullResult: {
          projectId: localConfig.projectId,
          oldVersion: localConfig.schema.version || 0,
          newVersion: remoteSchema.version || 0,
          filePath
        }
      });

    } catch (error) {
      setState({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Failed to pull schema'
      });
    }
  };

  if (state.phase === 'checking') {
    return <Spinner text="Checking pull status..." />;
  }

  if (state.phase === 'pulling') {
    return <Spinner text="Pulling latest schema..." />;
  }

  if (state.phase === 'error') {
    // Exit immediately with error code
    setTimeout(() => process.exit(1), 0);
    
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {state.error}</Text>
        
        {/* Next Steps for errors */}
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text color="blue">Next steps:</Text>
          {state.error?.includes('offline') || state.error?.includes('network') ? (
            <>
              <Text color="gray">• Check your internet connection</Text>
              <Text color="gray">• Try again in a moment</Text>
            </>
          ) : state.error?.includes('logged') || state.error?.includes('auth') ? (
            <>
              <Text color="gray">• Run 'basic login' to authenticate</Text>
              <Text color="gray">• Ensure you have a valid account</Text>
            </>
          ) : state.error?.includes('schema') || state.error?.includes('project') ? (
            <>
              <Text color="gray">• Check if the project ID is correct</Text>
              <Text color="gray">• Ensure you have access to this project</Text>
              <Text color="gray">• Run 'basic status' for more details</Text>
            </>
          ) : (
            <>
              <Text color="gray">• Try running the command again</Text>
              <Text color="gray">• Run 'basic status' to check your project state</Text>
              <Text color="gray">• Check the Basic documentation if the issue persists</Text>
            </>
          )}
        </Box>
      </Box>
    );
  }

  if (state.phase === 'success' && state.pullResult) {
    // Exit immediately on success
    setTimeout(() => process.exit(0), 0);
    return <PullSuccessDisplay result={state.pullResult} />;
  }

  if (state.phase === 'confirming' && state.statusResult) {
    return (
      <PullConfirmationDialog
        statusResult={state.statusResult}
        selectedOption={selectedOption}
      />
    );
  }

  if (state.phase === 'no-action' && state.statusResult) {
    // Exit immediately for no-action states
    setTimeout(() => process.exit(0), 0);
    return <PullStatusDisplay result={state.statusResult} />;
  }

  return <Text>Unknown state</Text>;
}

async function analyzePullAction(
  localConfig: { schema: Schema; projectId: string; filePath: string },
  remoteSchema: Schema,
  comparison: ReturnType<typeof compareVersions>,
  apiClient: ApiClient
): Promise<{
  status: 'current' | 'behind' | 'ahead' | 'conflict' | 'invalid' | 'no-schema';
  projectId: string;
  localVersion: number;
  remoteVersion: number;
  message: string[];
  needsConfirmation: boolean;
  confirmationTitle: string;
  confirmationMessage: string;
}> {
  const { projectId } = localConfig;
  
  const baseResult = {
    projectId,
    localVersion: comparison.localVersion,
    remoteVersion: comparison.remoteVersion,
    message: [],
    needsConfirmation: false,
    confirmationTitle: '',
    confirmationMessage: ''
  };

  switch (comparison.status) {
    case 'behind':
      return {
        ...baseResult,
        status: 'behind',
        message: [
          'Your local schema is behind the remote version.',
          'Pull the latest changes?'
        ],
        needsConfirmation: true,
        confirmationTitle: 'Pull Remote Schema',
        confirmationMessage: 'This will update your local schema to the latest version.'
      };

    case 'equal':
      // For version 0, assume it's current (no conflicts possible for first version)
      if (comparison.localVersion === 0 && comparison.remoteVersion === 0) {
        return {
          ...baseResult,
          status: 'current',
          message: [
            'Schema is up to date!',
            'No pull needed.'
          ]
        };
      }
      
      // For same non-zero versions, check for actual content differences
      try {
        const comparisonResult = await apiClient.compareSchema(localConfig.schema);
        
        if (comparisonResult.valid) {
          // Schemas match - truly up to date
          return {
            ...baseResult,
            status: 'current',
            message: [
              'Schema is up to date!',
              'No pull needed.'
            ]
          };
        } else {
          // Same version but different content - conflict detected
          return {
            ...baseResult,
            status: 'conflict',
            message: [
              'Schema conflicts detected!',
              'Your local schema differs from the remote schema at the same version.',
              'Pull the remote version to override local changes?'
            ],
            needsConfirmation: true,
            confirmationTitle: 'Override Local Changes',
            confirmationMessage: 'This will replace your local schema with the remote version.'
          };
        }
      } catch (error) {
        // If comparison fails, assume current to be safe
        return {
          ...baseResult,
          status: 'current',
          message: [
            'Schema is up to date!',
            'No pull needed.',
            '(Unable to verify schema content - assuming current)'
          ]
        };
      }

    case 'ahead':
      return {
        ...baseResult,
        status: 'ahead',
        message: [
          'Your local schema is ahead of the remote version.',
          'Did you mean to push instead?',
          'Use \'basic push\' to publish your changes.'
        ]
      };

    default:
      return {
        ...baseResult,
        status: 'current',
        message: [
          'Schema is up to date!',
          'No pull needed.'
        ]
      };
  }
}

function PullConfirmationDialog({ 
  statusResult, 
  selectedOption 
}: { 
  statusResult: NonNullable<PullState['statusResult']>; 
  selectedOption: 'yes' | 'no';
}) {
  const getStatusIcon = () => {
    switch (statusResult.status) {
      case 'behind': return '⬇️';
      case 'conflict': return '⚠️';
      default: return '📥';
    }
  };

  const getStatusText = () => {
    switch (statusResult.status) {
      case 'behind': return 'Schema is out of date';
      case 'conflict': return 'Schema conflicts detected';
      default: return 'Schema update available';
    }
  };

  const getStatusColor = () => {
    switch (statusResult.status) {
      case 'behind': return 'yellow';
      case 'conflict': return 'magenta';
      default: return 'blue';
    }
  };

  return (
    <Box flexDirection="column">
      {/* Project Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan">Project ID: {statusResult.projectId}</Text>
        <Box>
          <Text color="gray">Local version: {statusResult.localVersion}</Text>
          {statusResult.remoteVersion > 0 && (
            <Text color="gray"> • Remote version: {statusResult.remoteVersion}</Text>
          )}
        </Box>
      </Box>

      {/* Status */}
      <Box marginBottom={1}>
        <Text color={getStatusColor()}>
          {getStatusIcon()} {getStatusText()}
        </Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" marginBottom={2}>
        {statusResult.message.map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
      </Box>

      {/* Options */}
      <Box flexDirection="column">
        <Box>
          <Text color={selectedOption === 'yes' ? 'green' : 'gray'}>
            {selectedOption === 'yes' ? '❯' : ' '} Yes, pull changes
          </Text>
        </Box>
        <Box>
          <Text color={selectedOption === 'no' ? 'green' : 'gray'}>
            {selectedOption === 'no' ? '❯' : ' '} No, cancel
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Use ↑↓ to navigate, Enter to confirm, Esc to cancel</Text>
      </Box>
    </Box>
  );
}

function PullStatusDisplay({ result }: { result: NonNullable<PullState['statusResult']> }) {
  const getStatusColor = () => {
    switch (result.status) {
      case 'current': return 'green';
      case 'ahead': return 'blue';
      case 'conflict': return 'magenta';
      case 'no-schema': return 'gray';
      default: return 'white';
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'current': return '✅';
      case 'ahead': return '🚀';
      case 'conflict': return '⚠️';
      case 'no-schema': return '📄';
      default: return '❓';
    }
  };

  const getStatusDescription = () => {
    switch (result.status) {
      case 'current': return 'Schema is up to date';
      case 'ahead': return 'Local schema is ahead';
      case 'conflict': return 'Schema conflicts detected';
      case 'no-schema': return 'No schema file found';
      default: return 'Unknown status';
    }
  };

  const getNextSteps = () => {
    switch (result.status) {
      case 'current':
        return [
          'Continue working on your project',
          'Run \'basic status\' to check for changes',
          'Make schema modifications if needed'
        ];
      case 'ahead':
        return [
          'Run \'basic push\' to publish your changes',
          'Or run \'basic status\' for more details'
        ];
      case 'conflict':
        return [
          'Run \'basic pull\' again to override local changes',
          'Or run \'basic status\' to understand the differences',
          'Consider backing up your local changes first'
        ];
      case 'no-schema':
        return [
          'Run \'basic init\' to create a new project or import an existing project',
          'Make sure you\'re in a directory with a basic.config.ts/js file'
        ];
      default:
        return [];
    }
  };

  return (
    <Box flexDirection="column">
      {/* Project Info (only if we have a project) */}
      {result.projectId && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">Project ID: {result.projectId}</Text>
          <Box>
            <Text color="gray">Local version: {result.localVersion}</Text>
            {result.remoteVersion > 0 && (
              <Text color="gray"> • Remote version: {result.remoteVersion}</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Status */}
      <Box marginBottom={1}>
        <Text color={getStatusColor()}>
          {getStatusIcon()} {getStatusDescription()}
        </Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" marginBottom={1}>
        {result.message.map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
      </Box>

      {/* Next Steps */}
      {getNextSteps().length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="blue">Next steps:</Text>
          {getNextSteps().map((step, index) => (
            <Text key={index} color="gray">
              • {step}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

function PullSuccessDisplay({ result }: { result: NonNullable<PullState['pullResult']> }) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="green">✅ Schema updated successfully!</Text>
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        <Text>Updated: {result.filePath.split('/').pop()}</Text>
        <Text>Version: {result.oldVersion} → {result.newVersion}</Text>
        <Text>Project: {result.projectId}</Text>
      </Box>

      {/* Next Steps */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="blue">Next steps:</Text>
        <Text color="gray">• Review the updated schema changes</Text>
        <Text color="gray">• Continue working on your project</Text>
        <Text color="gray">• Run 'basic status' to check your project state</Text>
      </Box>
    </Box>
  );
}

export async function PullCommand(): Promise<void> {
  render(<PullApp />);
} 