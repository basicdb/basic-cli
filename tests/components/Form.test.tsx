import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Form, FormField } from '../../src/components/Form';
import React from 'react';

// Mock the useInput hook to avoid stdin.ref errors in testing
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn()
  };
});

describe('Form Component', () => {
  const mockFields: FormField[] = [
    {
      name: 'teamName',
      label: 'Team Name',
      type: 'text',
      required: true,
      placeholder: 'Enter team name'
    },
    {
      name: 'teamSlug',
      label: 'Team Slug',
      type: 'text',
      required: true,
      placeholder: 'team-slug'
    }
  ];

  const mockProps = {
    title: 'Create New Team',
    fields: mockFields,
    onSubmit: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form title', () => {
      const { lastFrame } = render(<Form {...mockProps} />);
      
      expect(lastFrame()).toContain('Create New Team');
    });

    it('should render all form fields', () => {
      const { lastFrame } = render(<Form {...mockProps} />);
      
      expect(lastFrame()).toContain('Team Name');
      expect(lastFrame()).toContain('Team Slug');
    });

    it('should show help text', () => {
      const { lastFrame } = render(<Form {...mockProps} />);
      
      expect(lastFrame()).toContain('Enter to continue • esc to cancel');
    });

    it('should highlight the first field as active', () => {
      const { lastFrame } = render(<Form {...mockProps} />);
      
      expect(lastFrame()).toContain('> Team Name:');
    });

    it('should show cursor on active field', () => {
      const { lastFrame } = render(<Form {...mockProps} />);
      
      // Should show cursor (█) on the active field
      expect(lastFrame()).toContain('█');
    });
  });

  describe('Form Props', () => {
    it('should accept title prop', () => {
      const customTitle = 'Custom Form Title';
      const { lastFrame } = render(<Form {...mockProps} title={customTitle} />);
      
      expect(lastFrame()).toContain(customTitle);
    });

    it('should render correct number of fields', () => {
      const singleField = [{
        name: 'test',
        label: 'Test Field',
        type: 'text' as const,
        required: true
      }];
      
      const { lastFrame } = render(<Form {...mockProps} fields={singleField} />);
      
      expect(lastFrame()).toContain('Test Field');
      expect(lastFrame()).not.toContain('Team Slug');
    });

    it('should handle required field indicators', () => {
      const { lastFrame } = render(<Form {...mockProps} />);
      
      // Form should render without errors when required fields are present
      expect(lastFrame()).toContain('Team Name');
    });
  });

  describe('Component Structure', () => {
    it('should import and exist', () => {
      expect(Form).toBeDefined();
      expect(typeof Form).toBe('function');
    });

    it('should accept all required props', () => {
      // This test verifies the component renders without errors with all props
      expect(() => render(<Form {...mockProps} />)).not.toThrow();
    });
  });
}); 