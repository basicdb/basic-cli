import React from 'react';
import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeamForm } from '../../src/components/TeamForm';
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
      checkTeamSlugAvailability: vi.fn()
    }))
  }
}));

// Mock the platform utility
vi.mock('../../src/lib/platform', () => ({
  generateSlug: vi.fn((name: string) => 
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  )
}));

describe('TeamForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockApiClient = { checkTeamSlugAvailability: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (ApiClient.getInstance as any).mockReturnValue(mockApiClient);
    mockApiClient.checkTeamSlugAvailability.mockResolvedValue(true);
  });

  it('renders the team form with title', () => {
    const { lastFrame } = render(
      <TeamForm
        title="Create New Team"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(lastFrame()).toContain('Create New Team');
    expect(lastFrame()).toContain('Team Name:');
  });

  it('displays initial state correctly', () => {
    const { lastFrame } = render(
      <TeamForm
        title="Create New Team"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(lastFrame()).toContain('Type team name • esc to cancel');
    expect(lastFrame()).not.toContain('Team Slug');
  });

  it('shows help text based on current state', () => {
    const { lastFrame } = render(
      <TeamForm
        title="Create New Team"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Initially should show typing instruction
    expect(lastFrame()).toContain('Type team name • esc to cancel');
  });

  it('handles empty team name state', () => {
    const { lastFrame } = render(
      <TeamForm
        title="Create New Team"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Should not show slug section when team name is empty
    expect(lastFrame()).not.toContain('Team Slug (auto-generated)');
  });

  it('displays the form structure correctly', () => {
    const { lastFrame } = render(
      <TeamForm
        title="Create New Team"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const output = lastFrame();
    
    // Check that the main form elements are present
    expect(output).toContain('Create New Team');
    expect(output).toContain('Team Name:');
    expect(output).toContain('esc to cancel');
  });

  it('shows different help text based on form state', () => {
    const { lastFrame } = render(
      <TeamForm
        title="Create New Team"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Initially should show team name instruction
    expect(lastFrame()).toContain('Type team name • esc to cancel');
  });
}); 