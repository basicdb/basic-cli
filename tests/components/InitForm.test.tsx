import React from 'react';
import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InitForm } from '../../src/components/InitForm';
import { ApiClient } from '../../src/lib/api';

// Mock the useInput hook from ink
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn()
  };
});

// Mock the ApiClient
vi.mock('../../src/lib/api', () => ({
  ApiClient: {
    getInstance: vi.fn(() => ({
      getTeams: vi.fn(),
      getProjects: vi.fn(),
      createProjectWithTeam: vi.fn(),
      getProject: vi.fn(),
      createTeam: vi.fn()
    }))
  }
}));

// Mock the auth service
vi.mock('../../src/lib/auth', () => ({
  AuthService: {
    getInstance: vi.fn(() => ({
      getToken: vi.fn()
    }))
  }
}));

// Mock platform utilities
vi.mock('../../src/lib/platform', () => ({
  generateSlug: vi.fn((name: string) => 
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  ),
  isOnline: vi.fn(() => Promise.resolve(true))
}));

// Mock config templates
vi.mock('../../src/lib/config-templates', () => ({
  CONFIG_TEMPLATES: {
    typescript: {
      name: 'TypeScript',
      description: 'Basic TypeScript configuration',
      filename: 'basic.config.ts',
      extension: 'ts'
    },
    javascript: {
      name: 'JavaScript', 
      description: 'Basic JavaScript configuration',
      filename: 'basic.config.js',
      extension: 'js'
    },
    none: {
      name: 'None',
      description: 'No configuration file',
      filename: '',
      extension: ''
    }
  },
  createConfigFile: vi.fn()
}));

describe('InitForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockApiClient = {
    getTeams: vi.fn(),
    getProjects: vi.fn(),
    createProjectWithTeam: vi.fn(),
    getProject: vi.fn(),
    createTeam: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (ApiClient.getInstance as any).mockReturnValue(mockApiClient);
    mockApiClient.getTeams.mockResolvedValue([
      { id: 'team1', name: 'My Team', slug: 'my-team' }
    ]);
    mockApiClient.getProjects.mockResolvedValue([
      { id: 'proj1', name: 'My Project', team_name: 'My Team' }
    ]);
  });

  it('renders the initial step correctly', () => {
    const { lastFrame } = render(
      <InitForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(lastFrame()).toContain('Project Setup (1/4)');
    expect(lastFrame()).toContain('How would you like to proceed?');
  });

  it('shows loading state initially', () => {
    const { lastFrame } = render(
      <InitForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Initially should show loading while fetching teams/projects
    expect(lastFrame()).toContain('Loading...');
  });

  it('handles initial data correctly', () => {
    const { lastFrame } = render(
      <InitForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        initialData={{
          source: 'new',
          projectName: 'Test Project'
        }}
      />
    );

    // Should skip source selection and go to project details
    // Once API calls resolve, it should show the project details step
    expect(lastFrame()).toContain('Create New Project (2/5)');
    expect(lastFrame()).toContain('Test Project');
  });

  it('displays error state correctly', async () => {
    mockApiClient.getTeams.mockRejectedValue(new Error('API Error'));

    const { lastFrame } = render(
      <InitForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Wait for error to appear
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(lastFrame()).toContain('Error:');
  });

  it('renders different steps correctly', () => {
    const { lastFrame } = render(
      <InitForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        initialData={{ source: 'existing' }}
      />
    );

    // Should start with existing project selection when source is 'existing'
    // Once API calls resolve, it should show the existing project step
    // For existing projects, this is step 1 but the numbering logic shows it as the step in sequence
    expect(lastFrame()).toContain('Import Existing Project');
    expect(lastFrame()).toContain('Select Project:');
  });


}); 