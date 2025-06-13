import React from 'react';
import { render, Text } from 'ink';
import { Table, TableColumn, TableRow } from '../components/Table';
import { Spinner } from '../components/Spinner';
import { ApiClient } from '../lib/api';
import { AuthService } from '../lib/auth';
import { isOnline, openBrowser, copyToClipboard } from '../lib/platform';
import { MESSAGES } from '../lib/constants';
import type { Project } from '../lib/types';

interface ProjectsState {
  loading: boolean;
  projects: Project[];
  error: string | null;
}

function ProjectsApp() {
  const [state, setState] = React.useState<ProjectsState>({
    loading: true,
    projects: [],
    error: null
  });

  React.useEffect(() => {
    async function loadProjects() {
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

        // Fetch projects
        const apiClient = ApiClient.getInstance();
        const projects = await apiClient.getProjects();
        
        setState({
          loading: false,
          projects,
          error: null
        });
      } catch (error) {
        setState({
          loading: false,
          projects: [],
          error: error instanceof Error ? error.message : 'Failed to load projects'
        });
      }
    }

    loadProjects();
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
      await openBrowser(`https://app.basic.tech/project/${row.id}`);
    } catch (error) {
      // Silent fail - browser opening is best effort
    }
  };

  const handleExit = () => {
    process.exit(0);
  };

  if (state.loading) {
    return <Spinner text="Loading projects..." />;
  }

  if (state.error) {
    return <Text color="red">{state.error}</Text>;
  }

  const columns: TableColumn[] = [
    { title: 'ID', width: 38, key: 'id' },
    { title: 'Name', width: 25, key: 'name' },
    { title: 'Team', width: 30, key: 'team_name' }
  ];

  const rows: TableRow[] = state.projects.map(project => ({
    id: project.id,
    name: project.name,
    team_name: project.team_name
  }));

  return (
    <Table
      columns={columns}
      rows={rows}
      onCopy={handleCopy}
      onOpen={handleOpen}
      onExit={handleExit}
    />
  );
}

export async function ProjectsCommand(): Promise<void> {
  render(<ProjectsApp />);
} 