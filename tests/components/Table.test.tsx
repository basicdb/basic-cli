import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Table, TableColumn, TableRow } from '../../src/components/Table';

describe('Table component', () => {
  const mockColumns: TableColumn[] = [
    { title: 'ID', width: 10, key: 'id' },
    { title: 'Name', width: 15, key: 'name' },
    { title: 'Status', width: 10, key: 'status' }
  ];

  const mockRows: TableRow[] = [
    { id: '1', name: 'Project One', status: 'Active' },
    { id: '2', name: 'Project Two', status: 'Inactive' },
    { id: '3', name: 'Project Three', status: 'Active' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with headers and rows', () => {
    const { lastFrame } = render(
      <Table columns={mockColumns} rows={mockRows} />
    );

    const output = lastFrame();
    
    // Should contain headers
    expect(output).toContain('ID');
    expect(output).toContain('Name');
    expect(output).toContain('Status');
    
    // Should contain row data
    expect(output).toContain('Project One');
    expect(output).toContain('Project Two');
    expect(output).toContain('Active');
  });
});

// Note: Additional tests for Table component interactions (keyboard navigation, 
// copy/open functionality) would require a more sophisticated testing setup
// that properly mocks the stdin.ref used by React Ink's useInput hook. 