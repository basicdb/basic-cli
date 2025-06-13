import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ApiClient } from '../lib/api';
import { generateSlug } from '../lib/platform';

export interface TeamFormProps {
  title: string;
  onSubmit: (data: { teamName: string; teamSlug: string }) => void | Promise<void>;
  onCancel: () => void;
}

interface TeamFormState {
  teamName: string;
  teamSlug: string;
  currentField: 'name' | 'slug' | 'submitting';
  isCheckingSlug: boolean;
  slugAvailable: boolean | null;
  error: string | null;
}

export function TeamForm({ title, onSubmit, onCancel }: TeamFormProps) {
  const [state, setState] = useState<TeamFormState>({
    teamName: '',
    teamSlug: '',
    currentField: 'name',
    isCheckingSlug: false,
    slugAvailable: null,
    error: null
  });

  // Auto-generate slug when team name changes
  useEffect(() => {
    if (state.teamName.trim()) {
      const newSlug = generateSlug(state.teamName);
      setState(prev => ({ 
        ...prev, 
        teamSlug: newSlug,
        slugAvailable: null,
        error: null
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        teamSlug: '',
        slugAvailable: null,
        error: null
      }));
    }
  }, [state.teamName]);

  // Check slug availability when slug changes
  useEffect(() => {
    if (state.teamSlug.trim() && (state.currentField === 'name' || state.currentField === 'slug')) {
      const checkAvailability = async () => {
        setState(prev => ({ ...prev, isCheckingSlug: true, error: null }));
        
        try {
          const apiClient = ApiClient.getInstance();
          const available = await apiClient.checkTeamSlugAvailability(state.teamSlug);
          setState(prev => ({ 
            ...prev, 
            isCheckingSlug: false, 
            slugAvailable: available,
            error: available ? null : 'Team slug is already taken'
          }));
        } catch (error) {
          setState(prev => ({ 
            ...prev, 
            isCheckingSlug: false, 
            slugAvailable: false,
            error: 'Error checking slug availability'
          }));
        }
      };

      const timeoutId = setTimeout(checkAvailability, 500); // Debounce for 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [state.teamSlug, state.currentField]);

  useInput((input, key) => {
    if (state.currentField === 'submitting') {
      return; // Don't handle input while submitting
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (state.currentField === 'name') {
        // Move to slug editing if team name is provided
        if (!state.teamName.trim()) {
          setState(prev => ({ ...prev, error: 'Team name is required' }));
          return;
        }
        setState(prev => ({ ...prev, currentField: 'slug', error: null }));
        return;
      }

      if (state.currentField === 'slug') {
        // Validate and submit
        if (!state.teamSlug.trim()) {
          setState(prev => ({ ...prev, error: 'Team slug is required' }));
          return;
        }

        if (!state.slugAvailable) {
          setState(prev => ({ ...prev, error: 'Please wait for slug availability check or choose a different name' }));
          return;
        }

        setState(prev => ({ ...prev, currentField: 'submitting', error: null }));
        const result = onSubmit({ teamName: state.teamName, teamSlug: state.teamSlug });
        if (result instanceof Promise) {
          result.catch((error) => {
            setState(prev => ({ 
              ...prev, 
              currentField: 'slug',
              error: error.message || 'Failed to create team'
            }));
          });
        }
        return;
      }
    }

    if (key.backspace || key.delete) {
      if (state.currentField === 'name') {
        setState(prev => ({
          ...prev,
          teamName: prev.teamName.slice(0, -1),
          error: null
        }));
      } else if (state.currentField === 'slug') {
        setState(prev => ({
          ...prev,
          teamSlug: prev.teamSlug.slice(0, -1),
          error: null
        }));
      }
      return;
    }

    // Add character to current field
    if (input && input.length === 1) {
      if (state.currentField === 'name') {
        setState(prev => ({
          ...prev,
          teamName: prev.teamName + input,
          error: null
        }));
      } else if (state.currentField === 'slug') {
        setState(prev => ({
          ...prev,
          teamSlug: prev.teamSlug + input,
          error: null
        }));
      }
    }
  });

  const getSlugStatus = () => {
    if (!state.teamSlug.trim()) return null;
    if (state.isCheckingSlug) return 'checking';
    if (state.slugAvailable === true) return 'available';
    if (state.slugAvailable === false) return 'unavailable';
    return null;
  };

  const getSlugStatusText = () => {
    const status = getSlugStatus();
    switch (status) {
      case 'checking':
        return '⏳ Checking availability...';
      case 'available':
        return '✅ Slug available';
      case 'unavailable':
        return '❌ Slug not available';
      default:
        return '';
    }
  };

  const getSlugStatusColor = () => {
    const status = getSlugStatus();
    switch (status) {
      case 'checking':
        return 'yellow';
      case 'available':
        return 'green';
      case 'unavailable':
        return 'red';
      default:
        return 'gray';
    }
  };

  const canSubmit = state.teamName.trim() && state.slugAvailable === true && !state.isCheckingSlug;

  const getHelpText = () => {
    if (state.currentField === 'name') {
      return state.teamName.trim() 
        ? 'Enter to edit slug • esc to cancel'
        : 'Type team name • esc to cancel';
    } else if (state.currentField === 'slug') {
      return canSubmit 
        ? 'Enter to create team • esc to cancel'
        : 'Edit team slug • esc to cancel';
    }
    return 'esc to cancel';
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="blue">{title}</Text>
      </Box>

      {/* Team Name Field */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={state.currentField === 'name' ? 'blue' : 'gray'}>
            {state.currentField === 'name' ? '>' : '✓'} Team Name:
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text>
            {state.teamName}
            {state.currentField === 'name' && (
              <Text backgroundColor="white" color="black">█</Text>
            )}
          </Text>
        </Box>
      </Box>

      {/* Team Slug Field */}
      {state.teamSlug && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={state.currentField === 'slug' ? 'blue' : 'gray'}>
              {state.currentField === 'slug' ? '>' : '✓'} Team Slug{state.currentField === 'name' ? ' (auto-generated)' : ''}:
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text>
              {state.teamSlug}
              {state.currentField === 'slug' && (
                <Text backgroundColor="white" color="black">█</Text>
              )}
            </Text>
          </Box>
          {getSlugStatus() && (
            <Box marginLeft={2}>
              <Text color={getSlugStatusColor()}>{getSlugStatusText()}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Error Display */}
      {state.error && (
        <Box marginLeft={2} marginBottom={1}>
          <Text color="red">Error: {state.error}</Text>
        </Box>
      )}

      {/* Help Text */}
      <Box marginTop={2}>
        <Text color="gray">
          {getHelpText()}
        </Text>
      </Box>
    </Box>
  );
} 