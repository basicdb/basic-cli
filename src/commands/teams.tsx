import React from 'react';
import { render, Box, Text } from 'ink';
import { Table, TableColumn, TableRow } from '../components/Table';
import { Spinner } from '../components/Spinner';
import { TeamForm } from '../components/TeamForm';
import { ApiClient } from '../lib/api';
import { AuthService } from '../lib/auth';
import { isOnline, openBrowser, copyToClipboard } from '../lib/platform';
import { MESSAGES } from '../lib/constants';
import type { Team } from '../lib/types';

interface TeamsState {
  loading: boolean;
  teams: Team[];
  error: string | null;
}

interface NewTeamState {
  loading: boolean;
  error: string | null;
  success: boolean;
  teamName: string;
  teamSlug: string;
}

function TeamsApp() {
  const [state, setState] = React.useState<TeamsState>({
    loading: true,
    teams: [],
    error: null
  });

  React.useEffect(() => {
    async function loadTeams() {
      try {
        // Check if online
        if (!(await isOnline())) {
          setState(prev => ({ ...prev, loading: false, error: MESSAGES.OFFLINE }));
          return;
        }

        // Check if logged in
        const authService = AuthService.getInstance();
        const token = await authService.getToken();
        if (!token) {
          setState(prev => ({ ...prev, loading: false, error: MESSAGES.LOGGED_OUT }));
          return;
        }

        // Fetch teams
        const apiClient = ApiClient.getInstance();
        const teams = await apiClient.getTeams();
        
        setState({
          loading: false,
          teams,
          error: null
        });
      } catch (error) {
        setState({
          loading: false,
          teams: [],
          error: error instanceof Error ? error.message : 'Failed to load teams'
        });
      }
    }

    loadTeams();
  }, []);

  const handleCopy = async (row: TableRow) => {
    try {
      await copyToClipboard(row.id);
    } catch (error) {
      // Silent fail - notification already shown by Table component
    }
  };

  const handleOpen = async (row: TableRow) => {
    try {
      await openBrowser(`https://app.basic.tech/team/${row.slug}`);
    } catch (error) {
      // Silent fail - browser opening is best effort
    }
  };

  const handleExit = () => {
    process.exit(0);
  };

  const handleNew = () => {
    // Re-render with the new team form
    render(<NewTeamApp />);
  };

  if (state.loading) {
    return <Spinner text="Loading teams..." />;
  }

  if (state.error) {
    return <Text color="red">{state.error}</Text>;
  }

  const columns: TableColumn[] = [
    { title: 'ID', width: 38, key: 'id' },
    { title: 'Name', width: 25, key: 'name' },
    { title: 'Role', width: 20, key: 'role_name' }
  ];

  const rows: TableRow[] = state.teams.map(team => ({
    id: team.id,
    name: team.name,
    role_name: team.role_name || 'Member',
    slug: team.slug
  }));

  return (
    <Table
      columns={columns}
      rows={rows}
      onCopy={handleCopy}
      onOpen={handleOpen}
      onExit={handleExit}
      onNew={handleNew}
      helpText={{
        copyAction: "'c' to copy team ID",
        openAction: "'o' to open in browser",
        newAction: "'n' to create a new team"
      }}
    />
  );
}

function NewTeamApp() {
  const [state, setState] = React.useState<NewTeamState>({
    loading: false,
    error: null,
    success: false,
    teamName: '',
    teamSlug: ''
  });

  const handleSubmit = async (data: { teamName: string; teamSlug: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check if online
      if (!(await isOnline())) {
        setState(prev => ({ ...prev, loading: false, error: MESSAGES.OFFLINE }));
        return;
      }

      // Check if logged in
      const authService = AuthService.getInstance();
      const token = await authService.getToken();
      if (!token) {
        setState(prev => ({ ...prev, loading: false, error: MESSAGES.LOGGED_OUT }));
        return;
      }

      // Create team
      const apiClient = ApiClient.getInstance();
      await apiClient.createTeam(data.teamName, data.teamSlug);
      
      setState({
        loading: false,
        error: null,
        success: true,
        teamName: data.teamName,
        teamSlug: data.teamSlug
      });

      // Exit after 2 seconds
      setTimeout(() => {
        process.exit(0);
      }, 2000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create team'
      }));
    }
  };

  if (state.loading) {
    return <Spinner text="Creating team..." />;
  }

  if (state.success) {
    return (
      <Box flexDirection="column">
        <Text color="green">✅ Team "{state.teamName}" created successfully!</Text>
        <Text>Team slug: {state.teamSlug}</Text>
      </Box>
    );
  }

  if (state.error) {
    return <Text color="red">{state.error}</Text>;
  }

  return (
    <TeamForm
      title="Create New Team"
      onSubmit={handleSubmit}
      onCancel={() => process.exit(0)}
    />
  );
}

export async function TeamsCommand(action?: string): Promise<void> {
  if (action === 'new') {
    // Render team creation form
    render(<NewTeamApp />);
  } else {
    // Default: render teams list
    render(<TeamsApp />);
  }
} 