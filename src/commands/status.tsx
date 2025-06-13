import React from 'react';
import { render, Box, Text } from 'ink';
import { Spinner } from '../components/Spinner';
import { ApiClient } from '../lib/api';
import { AuthService } from '../lib/auth';
import { readSchemaFromConfig, compareVersions } from '../lib/schema';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';
import type { Schema, ValidationResult } from '../lib/types';

interface StatusState {
  loading: boolean;
  error: string | null;
  result?: StatusResult;
}

interface StatusResult {
  status: 'current' | 'behind' | 'ahead' | 'conflict' | 'invalid' | 'no-schema';
  projectId: string;
  projectName?: string;
  localVersion: number;
  remoteVersion: number;
  message: string[];
  suggestions: string[];
  validationErrors?: ValidationResult['errors'];
}

function StatusApp() {
  const [state, setState] = React.useState<StatusState>({
    loading: true,
    error: null
  });

  React.useEffect(() => {
    async function checkStatus() {
      try {
        // Check if online
        if (!(await isOnline())) {
          setState({
            loading: false,
            error: MESSAGES.OFFLINE,
          });
          return;
        }

        // Check authentication
        const authService = AuthService.getInstance();
        const token = await authService.getToken();
        if (!token) {
          setState({
            loading: false,
            error: MESSAGES.LOGGED_OUT,
          });
          return;
        }

        // Read local schema
        const localConfig = await readSchemaFromConfig();
        if (!localConfig) {
          setState({
            loading: false,
            error: null,
            result: {
              status: 'no-schema',
              projectId: '',
              localVersion: 0,
              remoteVersion: 0,
              message: ['No schema found in config files'],
              suggestions: [
                'Run \'basic init\' to create a new project or import an existing project',
                'Make sure you\'re in a directory with a basic.config.ts/js file',
                'Check if your config file has the correct name and format'
              ]
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
            loading: false,
            error: null,
            result: {
              status: 'invalid',
              projectId: localConfig.projectId,
              localVersion: localConfig.schema.version || 0,
              remoteVersion: 0,
              message: [
                `Project ID: ${localConfig.projectId}`,
                `Error fetching remote schema: ${error instanceof Error ? error.message : 'Unknown error'}`
              ],
              suggestions: [
                'Check if the project ID is correct',
                'Ensure you have access to this project',
                'Verify your internet connection',
                'Try running \'basic login\' if authentication has expired'
              ]
            }
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

        // Compare versions
        const comparison = compareVersions(localConfig.schema, remoteSchema);
        const result = await analyzeStatus(localConfig, remoteSchema, comparison);
        
        setState({
          loading: false,
          error: null,
          result
        });

      } catch (error) {
        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to check status'
        });
      }
    }

    checkStatus();
  }, []);

  if (state.loading) {
    return <Spinner text="Checking status..." />;
  }

  if (state.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {state.error}</Text>
      </Box>
    );
  }

  if (state.result) {
    return <StatusDisplay result={state.result} />;
  }

  return <Text>Unknown status</Text>;
}

async function analyzeStatus(
  localConfig: { schema: Schema; projectId: string; filePath: string },
  remoteSchema: Schema,
  comparison: ReturnType<typeof compareVersions>
): Promise<StatusResult> {
  const apiClient = ApiClient.getInstance();
  const { schema: localSchema, projectId } = localConfig;
  
  const baseResult = {
    projectId,
    localVersion: comparison.localVersion,
    remoteVersion: comparison.remoteVersion,
    message: [`Project ID: ${projectId}`],
    suggestions: [] as string[]
  };

  // Add version info
  if (comparison.remoteVersion > 0) {
    baseResult.message.push(`Remote schema version: ${comparison.remoteVersion}`);
  }

  switch (comparison.status) {
    case 'behind':
      return {
        ...baseResult,
        status: 'behind',
        message: [
          ...baseResult.message,
          `Schema is out of date! Current: ${comparison.localVersion}, Latest: ${comparison.remoteVersion}`
        ],
        suggestions: [
          'Run \'basic pull\' to update your local schema',
          'Review the changes before pulling if you have local modifications',
          'Consider backing up your current schema if you have unsaved work'
        ]
      };

    case 'ahead':
      // Validate the local schema since it's ahead
      try {
        const validation = await apiClient.validateSchema(localSchema);
        
        if (validation.valid === false && validation.errors) {
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              ...baseResult.message,
              `Changes found: Local schema version ${comparison.localVersion} is ahead of remote version ${comparison.remoteVersion}`,
              'Errors found in schema! Please fix:'
            ],
            validationErrors: validation.errors,
            suggestions: [
              'Fix the validation errors shown below',
              'Run \'basic status\' again after fixing errors',
              'Review your schema syntax and field definitions'
            ]
          };
        }

        return {
          ...baseResult,
          status: 'ahead',
          message: [
            ...baseResult.message,
            `Changes found: Local schema version ${comparison.localVersion} is ahead of remote version ${comparison.remoteVersion}`,
            'Schema changes are valid!'
          ],
          suggestions: [
            'Run \'basic push\' to publish your changes',
            'Review your changes before publishing',
            'Test your schema locally if possible'
          ]
        };
      } catch (error) {
        return {
          ...baseResult,
          status: 'invalid',
          message: [
            ...baseResult.message,
            `Error validating schema: ${error instanceof Error ? error.message : 'Unknown error'}`
          ],
          suggestions: [
            'Check your schema for syntax errors',
            'Ensure all required fields are present',
            'Verify your basic.config file is valid JSON/JavaScript'
          ]
        };
      }

    case 'equal':
      // Same version - check for conflicts
      if (comparison.localVersion === 0 && comparison.remoteVersion === 0) {
        // Both at version 0 - validate and suggest incrementing
        try {
          const validation = await apiClient.validateSchema(localSchema);
          
          if (validation.valid === false && validation.errors) {
            return {
              ...baseResult,
              status: 'invalid',
              message: [
                ...baseResult.message,
                'Errors found in schema! Please fix:'
              ],
              validationErrors: validation.errors,
              suggestions: [
                'Fix the validation errors shown below',
                'Run \'basic status\' again after fixing errors'
              ]
            };
          }

          // Schema is valid and ready to push
          return {
            ...baseResult,
            status: 'ahead',
            message: [
              ...baseResult.message,
              '',
              'Schema changes are valid!',
              'Please increment your version number to 1',
              'and run \'basic push\' if you are ready to publish your changes.'
            ],
            suggestions: [
              'Update the version field in your schema from 0 to 1',
              'Run \'basic push\' after incrementing the version',
              'Ensure your schema changes are tested and ready for production'
            ]
          };
        } catch (error) {
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              ...baseResult.message,
              `Error validating schema: ${error instanceof Error ? error.message : 'Unknown error'}`
            ],
            suggestions: [
              'Check your schema for syntax errors'
            ]
          };
        }
      } else {
        // Same non-zero version - check for conflicts
        try {
          const comparison = await apiClient.compareSchema(localSchema);
          
          if (comparison.valid) {
            return {
              ...baseResult,
              status: 'current',
              message: [
                ...baseResult.message,
                'Schema is up to date!'
              ],
              suggestions: [
                'Continue working on your project',
                'Make schema modifications if needed',
                'Run \'basic status\' again after making changes'
              ]
            };
          } else {
            return {
              ...baseResult,
              status: 'conflict',
              message: [
                ...baseResult.message,
                '',
                'Schema conflicts found! Your local schema is different from the remote schema.'
              ],
              suggestions: [
                'Run \'basic pull\' to override local changes with remote schema',
                'Or increment the version number in your local schema',
                'Compare your local changes with the remote version before deciding',
                'Consider creating a backup of your local changes'
              ]
            };
          }
        } catch (error) {
          return {
            ...baseResult,
            status: 'invalid',
            message: [
              ...baseResult.message,
              `Error checking schema conflict: ${error instanceof Error ? error.message : 'Unknown error'}`
            ],
            suggestions: [
              'Check your network connection',
              'Ensure the project ID is correct'
            ]
          };
        }
      }

    default:
      return {
        ...baseResult,
        status: 'invalid',
        message: [
          ...baseResult.message,
          'Unknown schema status'
        ],
        suggestions: [
          'Try running \'basic status\' again'
        ]
      };
  }
}

function StatusDisplay({ result }: { result: StatusResult }) {
  const getStatusColor = () => {
    switch (result.status) {
      case 'current':
        return 'green';
      case 'ahead':
        return 'blue';
      case 'behind':
        return 'yellow';
      case 'conflict':
        return 'magenta';
      case 'invalid':
        return 'red';
      case 'no-schema':
        return 'gray';
      default:
        return 'white';
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'current':
        return '✅';
      case 'ahead':
        return '🚀';
      case 'behind':
        return '⬇️';
      case 'conflict':
        return '⚠️';
      case 'invalid':
        return '❌';
      case 'no-schema':
        return '📄';
      default:
        return '❓';
    }
  };

  const getStatusDescription = () => {
    switch (result.status) {
      case 'current':
        return 'Schema is up to date';
      case 'ahead':
        return 'Schema is ready to push';
      case 'behind':
        return 'Schema is out of date';
      case 'conflict':
        return 'Schema conflicts detected';
      case 'invalid':
        return 'Schema has validation errors';
      case 'no-schema':
        return 'No schema file found';
      default:
        return 'Unknown status';
    }
  };

  // Filter out project ID and version info from messages since we'll show them separately
  const statusMessages = result.message.filter(msg => 
    !msg.startsWith('Project ID:') && 
    !msg.startsWith('Remote schema version:')
  );

  return (
    <Box flexDirection="column">
      {/* Project Info Header */}
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

      {/* Status Section */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={getStatusColor()}>
            {getStatusIcon()} {getStatusDescription()}
          </Text>
        </Box>

        {/* Additional Status Messages */}
        {statusMessages.length > 0 && (
          <Box flexDirection="column">
            {statusMessages.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </Box>
        )}
      </Box>

      {/* Validation Errors */}
      {result.validationErrors && result.validationErrors.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red">Validation errors:</Text>
          {result.validationErrors.map((error, index) => (
            <Text key={index} color="red">
              • {error.message} at {error.instancePath || 'root'}
            </Text>
          ))}
        </Box>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="blue">Next steps:</Text>
          {result.suggestions.map((suggestion, index) => (
            <Text key={index} color="gray">
              • {suggestion}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

export async function StatusCommand(): Promise<void> {
  const { waitUntilExit } = render(<StatusApp />);
  
  // Wait for the component to finish rendering
  await waitUntilExit();
  
  // Ensure the process exits
  process.exit(0);
} 