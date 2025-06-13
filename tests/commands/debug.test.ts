import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebugCommand } from '../../src/commands/debug';
import { getConfigDir } from '../../src/lib/platform';

// Mock dependencies
vi.mock('../../src/lib/platform');

describe('DebugCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console.log to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should display the config directory path', async () => {
    const mockConfigDir = '/Users/testuser/.basic-cli';
    vi.mocked(getConfigDir).mockReturnValue(mockConfigDir);

    await DebugCommand();

    expect(getConfigDir).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(`Basic CLI config directory: ${mockConfigDir}`);
  });

  it('should handle different config directory paths', async () => {
    const mockConfigDir = '/home/user/.config/basic-cli';
    vi.mocked(getConfigDir).mockReturnValue(mockConfigDir);

    await DebugCommand();

    expect(console.log).toHaveBeenCalledWith(`Basic CLI config directory: ${mockConfigDir}`);
  });
}); 