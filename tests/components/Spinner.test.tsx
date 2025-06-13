import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Spinner } from '../../src/components/Spinner';

describe('Spinner component', () => {
  it('should render with default text', () => {
    const { lastFrame } = render(<Spinner />);
    
    expect(lastFrame()).toContain('Loading...');
    expect(lastFrame()).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/); // Should contain a spinner character
  });

  it('should render with custom text', () => {
    const { lastFrame } = render(<Spinner text="Processing..." />);
    
    expect(lastFrame()).toContain('Processing...');
    expect(lastFrame()).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/); // Should contain a spinner character
  });
}); 