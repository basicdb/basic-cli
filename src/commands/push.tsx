import React from 'react';
import { render, Box, Text, useInput } from 'ink';
import { Spinner } from '../components/Spinner';
import { ApiClient } from '../lib/api';
import { AuthService } from '../lib/auth';
import { readSchemaFromConfig, compareVersions } from '../lib/schema';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';
import type { Schema, ValidationError } from '../lib/types';

interface PushState {
  phase: 'checking' | 'confirming' | 'pushing' | 'success' | 'error' | 'no-action';
  error: string | null;
  statusResult?: {
    status: 'ahead' | 'current' | 'behind' | 'invalid' | 'no-schema';
    projectId: string;
    localVersion: number;
    remoteVersion: number;
    message: string[];
    needsConfirmation: boolean;
    confirmationTitle: string;
    confirmationMessage: string;
    validationErrors?: ValidationError[];
  };
  pushResult?: {
    projectId: string;
    oldVersion: number;
    newVersion: number;
    filePath: string;
  };
}

function PushApp() {
  const [state, setState] = React.useState<PushState>({
    phase: 'checking',
    error: null
  });

  const [selectedOption, setSelectedOption] = React.useState<'yes' | 'no'>('yes');

  React.useEffect(() => {
    async function checkPushStatus() {
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
        const result = await analyzePushAction(localConfig, remoteSchema, comparison, apiClient);
        
        setState({
          phase: result.needsConfirmation ? 'confirming' : 'no-action',
          error: null,
          statusResult: result
        });

      } catch (error) {
        setState({
          phase: 'error',
          error: error instanceof Error ? error.message : 'Failed to check push status'
        });
      }
    }

    checkPushStatus();
  }, []);

  // Handle confirmation input (only for interactive states)
  useInput((input, key) => {
    if (state.phase === 'confirming') {
      if (key.upArrow || key.downArrow) {
        setSelectedOption(prev => prev === 'yes' ? 'no' : 'yes');
      } else if (key.return) {
        if (selectedOption === 'yes') {
          handlePush();
        } else {
          setState(prev => ({ ...prev, phase: 'no-action' }));
        }
      } else if (key.escape || input === 'q') {
        setState(prev => ({ ...prev, phase: 'no-action' }));
      }
    }
  });

  const handlePush = async () => {
    setState(prev => ({ ...prev, phase: 'pushing' }));

    try {
      if (!state.statusResult) {
        throw new Error('No status result available');
      }

      // Re-fetch the latest data for pushing
      const localConfig = await readSchemaFromConfig();
      if (!localConfig) {
        throw new Error('Local schema not found');
      }

      const apiClient = ApiClient.getInstance();
      
      // Push the schema
      await apiClient.pushProjectSchema(localConfig.projectId, localConfig.schema);

      setState({
        phase: 'success',
        error: null,
        pushResult: {
          projectId: localConfig.projectId,
          oldVersion: state.statusResult.remoteVersion,
          newVersion: localConfig.schema.version || 0,
          filePath: localConfig.filePath
        }
      });

    } catch (error) {
      setState({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Failed to push schema'
      });
    }
  };

  if (state.phase === 'checking') {
    return <Spinner text="Checking push status..." />;
  }

  if (state.phase === 'pushing') {
    return <Spinner text="Pushing schema to remote..." />;
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

  if (state.phase === 'success' && state.pushResult) {
    // Exit immediately on success
    setTimeout(() => process.exit(0), 0);
    return <PushSuccessDisplay result={state.pushResult} />;
  }

  if (state.phase === 'confirming' && state.statusResult) {
    return (
      <PushConfirmationDialog
        statusResult={state.statusResult}
        selectedOption={selectedOption}
      />
    );
  }

  if (state.phase === 'no-action' && state.statusResult) {
    // Exit immediately for no-action states
    setTimeout(() => process.exit(0), 0);
    return <PushStatusDisplay result={state.statusResult} />;
  }

  return <Text>Unknown state</Text>;
}

async function analyzePushAction(
  localConfig: { schema: Schema; projectId: string; filePath: string },
  remoteSchema: Schema,
  comparison: ReturnType<typeof compareVersions>,
  apiClient: ApiClient
): Promise<{
  status: 'ahead' | 'current' | 'behind' | 'invalid' | 'no-schema';
  projectId: string;
  localVersion: number;
  remoteVersion: number;
  message: string[];
  needsConfirmation: boolean;
  confirmationTitle: string;
  confirmationMessage: string;
  validationErrors?: ValidationError[];
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
    case 'ahead':
      // Validate the local schema since it's ahead
      try {
        const validation = await apiClient.validateSchema(localConfig.schema);
        
        if (validation.valid === false && validation.errors) {
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              'Errors found in schema! Please fix:',
              'Your local schema has validation errors that must be resolved before pushing.'
            ],
            validationErrors: validation.errors
          };
        }

        return {
          ...baseResult,
          status: 'ahead',
          message: [
            'Your local schema is ahead of the remote version.',
            'Push your changes to publish them?'
          ],
          needsConfirmation: true,
          confirmationTitle: 'Push Schema Changes',
          confirmationMessage: 'This will publish your local schema changes to the remote project.'
        };
      } catch (error) {
        return {
          ...baseResult,
          status: 'invalid',
          message: [
            `Error validating schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'Please check your schema for syntax errors.'
          ]
        };
      }

    case 'equal':
      // Same version - check for version 0 case or true equality
      if (comparison.localVersion === 0 && comparison.remoteVersion === 0) {
        // Both at version 0 - validate and suggest incrementing
        try {
          const validation = await apiClient.validateSchema(localConfig.schema);
          
          if (validation.valid === false && validation.errors) {
            return {
              ...baseResult,
              status: 'invalid',
              message: [
                'Errors found in schema! Please fix:'
              ],
              validationErrors: validation.errors
            };
          }

          // Schema is valid but needs version increment
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              'Schema changes are valid!',
              'Please increment your version number to 1',
              'and run \'basic push\' if you are ready to publish your changes.'
            ]
          };
        } catch (error) {
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              `Error validating schema: ${error instanceof Error ? error.message : 'Unknown error'}`
            ]
          };
        }
      }
      
      // Same non-zero version - check for content differences
      try {
        const comparisonResult = await apiClient.compareSchema(localConfig.schema);
        
        if (comparisonResult.valid) {
          // Schemas match - no push needed
          return {
            ...baseResult,
            status: 'current',
            message: [
              'Schema is up to date!',
              'No push needed.'
            ]
          };
        } else {
          // Same version but different content - suggest incrementing version
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              'Your local schema differs from the remote schema.',
              'Please increment your version number before pushing changes.'
            ]
          };
        }
      } catch (error) {
        return {
          ...baseResult,
          status: 'current',
          message: [
            'Schema appears to be up to date.',
            '(Unable to verify schema content - assuming current)'
          ]
        };
      }

    case 'behind':
      return {
        ...baseResult,
        status: 'behind',
        message: [
          'Your local schema is behind the remote version.',
          'Did you mean to pull instead?',
          'Use \'basic pull\' to get the latest changes.'
        ]
      };

    default:
      return {
        ...baseResult,
        status: 'current',
        message: [
          'Schema is up to date!',
          'No push needed.'
        ]
      };
  }
}

function PushConfirmationDialog({ 
  statusResult, 
  selectedOption 
}: { 
  statusResult: NonNullable<PushState['statusResult']>; 
  selectedOption: 'yes' | 'no';
}) {
  const getStatusIcon = () => {
    switch (statusResult.status) {
      case 'ahead': return '⬆️';
      default: return '📤';
    }
  };

  const getStatusText = () => {
    switch (statusResult.status) {
      case 'ahead': return 'Ready to push changes';
      default: return 'Schema update ready';
    }
  };

  const getStatusColor = () => {
    switch (statusResult.status) {
      case 'ahead': return 'green';
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
            {selectedOption === 'yes' ? '❯' : ' '} Yes, push changes
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

function PushStatusDisplay({ result }: { result: NonNullable<PushState['statusResult']> }) {
  const getStatusColor = () => {
    switch (result.status) {
      case 'current': return 'green';
      case 'behind': return 'yellow';
      case 'invalid': return 'red';
      case 'no-schema': return 'gray';
      default: return 'white';
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'current': return '✅';
      case 'behind': return '⬇️';
      case 'invalid': return '❌';
      case 'no-schema': return '📄';
      default: return '❓';
    }
  };

  const getStatusDescription = () => {
    switch (result.status) {
      case 'current': return 'Schema is up to date';
      case 'behind': return 'Local schema is behind remote';
      case 'invalid': return 'Schema has validation errors';
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
      case 'behind':
        return [
          'Run \'basic pull\' to get the latest changes',
          'Or run \'basic status\' for more details'
        ];
      case 'invalid':
        return [
          'Fix the validation errors shown below',
          'Run \'basic status\' again after fixing errors',
          'Review your schema syntax and field definitions'
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

      {/* Validation Errors */}
      {result.validationErrors && result.validationErrors.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {result.validationErrors.map((error, index) => (
            <Text key={index} color="red">
              • {error.message} at {error.instancePath || 'root'}
            </Text>
          ))}
        </Box>
      )}

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

function PushSuccessDisplay({ result }: { result: NonNullable<PushState['pushResult']> }) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="green">✅ Schema pushed successfully!</Text>
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        <Text>Source: {result.filePath.split('/').pop()}</Text>
        <Text>Version: {result.oldVersion} → {result.newVersion}</Text>
        <Text>Project: {result.projectId}</Text>
      </Box>

      {/* Next Steps */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="blue">Next steps:</Text>
        <Text color="gray">• Your schema changes are now live</Text>
        <Text color="gray">• Continue working on your project</Text>
        <Text color="gray">• Run 'basic status' to check your project state</Text>
      </Box>
    </Box>
  );
}

export async function PushCommand(): Promise<void> {
  render(<PushApp />);
} 