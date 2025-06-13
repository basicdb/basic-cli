import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export interface TableColumn {
  title: string;
  width: number;
  key: string;
}

export interface TableRow {
  [key: string]: string;
}

export interface TableProps {
  columns: TableColumn[];
  rows: TableRow[];
  onSelect?: (row: TableRow, index: number) => void;
  onCopy?: (row: TableRow, index: number) => void;
  onOpen?: (row: TableRow, index: number) => void;
  onNew?: () => void;
  onExit?: () => void;
  helpText?: {
    copyAction: string;
    openAction: string;
    newAction?: string;
  };
}

export function Table({ columns, rows, onSelect, onCopy, onOpen, onNew, onExit, helpText }: TableProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [notification, setNotification] = useState<string>('');

  // Default help text for backward compatibility
  const defaultHelpText = {
    copyAction: "'c' to copy project ID",
    openAction: "'o' to open in browser",
    newAction: undefined
  };
  
  const currentHelpText = helpText || defaultHelpText;

  useInput((input, key) => {
    if (key.upArrow && rows.length > 0) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow && rows.length > 0) {
      setSelectedIndex(prev => Math.min(rows.length - 1, prev + 1));
    } else if (key.return && rows[selectedIndex] && onSelect) {
      onSelect(rows[selectedIndex], selectedIndex);
    } else if (input === 'c' && rows[selectedIndex] && onCopy) {
      onCopy(rows[selectedIndex], selectedIndex);
      const itemType = helpText?.copyAction.includes('team') ? 'Team ID' : 'Project ID';
      setNotification(`${itemType} copied to clipboard!`);
      setTimeout(() => setNotification(''), 3000);
    } else if (input === 'o' && rows[selectedIndex] && onOpen) {
      onOpen(rows[selectedIndex], selectedIndex);
    } else if (input === 'n' && onNew) {
      onNew();
    } else if (key.escape || (key.ctrl && input === 'c')) {
      if (onExit) {
        onExit();
      } else {
        process.exit(0);
      }
    }
  });

  // Reset selected index if rows change
  useEffect(() => {
    if (selectedIndex >= rows.length) {
      setSelectedIndex(Math.max(0, rows.length - 1));
    }
  }, [rows.length, selectedIndex]);

  const renderHeader = () => (
    <Box borderStyle="single" borderBottom={true} paddingX={1}>
      <Box>
        {columns.map((column, index) => (
          <Box key={column.key} width={column.width} marginRight={index < columns.length - 1 ? 1 : 0}>
            <Text bold>{column.title}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderRow = (row: TableRow, index: number) => {
    const isSelected = index === selectedIndex;
    
    return (
      <Box key={index}>
        <Box paddingX={1}>
          {columns.map((column, colIndex) => (
            <Box key={column.key} width={column.width} marginRight={colIndex < columns.length - 1 ? 1 : 0}>
              <Text 
                color={isSelected ? 'black' : undefined}
                backgroundColor={isSelected ? 'magenta' : undefined}
              >
                {(row[column.key] || '').substring(0, column.width - 1)}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderHelp = () => {
    const mainActionsText = [
      currentHelpText.copyAction,
      currentHelpText.openAction
    ].filter(Boolean).join(' • ');

    return (
      <Box marginTop={2}>
        {notification && (
          <Box marginBottom={2}>
            <Text color="blue">{notification}</Text>
          </Box>
        )}
        <Box flexDirection="column">
          {currentHelpText.newAction && (
            <Text color="gray">{currentHelpText.newAction}</Text>
          )}
          <Text color="gray">{mainActionsText}</Text>
          <Text color="gray">↑/↓ to navigate • esc to quit</Text>
        </Box>
      </Box>
    );
  };

  if (rows.length === 0) {
    const itemType = helpText?.copyAction.includes('team') ? 'teams' : 'projects';
    
    return (
      <Box flexDirection="column">
        <Text>No {itemType} found.</Text>
        <Box marginTop={2} flexDirection="column">
          {currentHelpText.newAction && (
            <Text color="gray">{currentHelpText.newAction}</Text>
          )}
          <Text color="gray">Press esc to quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {renderHeader()}
      <Box flexDirection="column">
        {rows.map((row, index) => renderRow(row, index))}
      </Box>
      {renderHelp()}
    </Box>
  );
} 