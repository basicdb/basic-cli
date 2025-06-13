import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCommand } from '../../src/commands/update';
import { getVersion } from '../../src/lib/version';
import { ApiClient } from '../../src/lib/api';
import { isOnline } from '../../src/lib/platform';
import { MESSAGES } from '../../src/lib/constants';
import { spawn } from 'child_process';

// Mock dependencies
vi.mock('../../src/lib/version');
vi.mock('../../src/lib/api');
vi.mock('../../src/lib/platform');
vi.mock('../../src/lib/constants');
vi.mock('child_process');

describe('UpdateCommand', () => {
  let mockApiClient: any;
  let mockProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock ApiClient
    mockApiClient = {
      checkLatestRelease: vi.fn()
    };
    vi.mocked(ApiClient.getInstance).mockReturnValue(mockApiClient);
    
    // Mock process object
    mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn()
    };
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exit called with code ${code}`);
    });
    
    // Default mocks
    vi.mocked(isOnline).mockResolvedValue(true);
  });

  it('should show already up-to-date message when versions match', async () => {
    const version = '1.0.0';
    vi.mocked(getVersion).mockReturnValue(version);
    mockApiClient.checkLatestRelease.mockResolvedValue(version);

    await UpdateCommand();

    expect(console.log).toHaveBeenCalledWith(`Current version: ${version}`);
    expect(console.log).toHaveBeenCalledWith('Checking for updates...');
    expect(console.log).toHaveBeenCalledWith('✅ You are already running the latest version!');
  });

  it('should attempt update when newer version is available', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    // Mock successful npm update
    mockProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0); // Success exit code
      }
    });

    await UpdateCommand();

    expect(console.log).toHaveBeenCalledWith(`Current version: ${currentVersion}`);
    expect(console.log).toHaveBeenCalledWith(`🚀 New version available: ${latestVersion}`);
    expect(console.log).toHaveBeenCalledWith('Updating...');
    
    expect(spawn).toHaveBeenCalledWith('npm', ['update', '-g', '@basictech/cli'], {
      stdio: 'pipe',
      shell: true
    });
  });

  it('should handle offline state', async () => {
    vi.mocked(isOnline).mockResolvedValue(false);

    // Since the function calls process.exit(), it won't actually return
    // We need to catch the exit call
    try {
      await UpdateCommand();
    } catch (error) {
      // process.exit() mock might throw or not - either is fine
    }

    expect(console.error).toHaveBeenCalledWith('you are offline. please check your internet connection.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(getVersion).mockReturnValue('1.0.0');
    vi.mocked(isOnline).mockResolvedValue(true);
    mockApiClient.checkLatestRelease.mockRejectedValue(new Error('Network error'));

    try {
      await UpdateCommand();
    } catch (error) {
      // Expected to throw due to process.exit() mock
      expect((error as Error).message).toContain('Process exit called with code 1');
    }

    expect(console.error).toHaveBeenCalledWith('❌ Error checking for updates:', 'Network error');
    expect(console.log).toHaveBeenCalledWith('\n💡 You can try updating manually:');
    expect(console.log).toHaveBeenCalledWith('   npm update -g @basictech/cli');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle npm update success', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    // Mock successful update process
    mockProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0); // Success
      }
    });

    await UpdateCommand();

    expect(spawn).toHaveBeenCalledWith('npm', ['update', '-g', '@basictech/cli'], {
      stdio: 'pipe',
      shell: true
    });
  });

  it('should handle npm update failure', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    // Mock failed update process
    mockProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(1), 0); // Error exit code
      }
    });

    // The command should start the update process, but it will fail
    try {
      await UpdateCommand();
    } catch (error) {
      // Expected to throw due to npm update failure
      expect(error).toBeInstanceOf(Error);
    }

    expect(spawn).toHaveBeenCalled();
  });

  it('should handle spawn process error', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    // Mock process spawn error
    mockProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'error') {
        setTimeout(() => callback(new Error('Spawn failed')), 0);
      }
    });

    // The command should start the update process, but it will fail
    try {
      await UpdateCommand();
    } catch (error) {
      // Expected to throw due to spawn failure
      expect(error).toBeInstanceOf(Error);
    }

    expect(spawn).toHaveBeenCalled();
  });

  it('should capture and display stdout/stderr from npm update', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    // Mock data events for stdout/stderr
    mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'data') {
        setTimeout(() => callback(Buffer.from('npm output')), 0);
      }
    });

    mockProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'data') {
        setTimeout(() => callback(Buffer.from('npm error')), 0);
      }
    });

    mockProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0); // Success
      }
    });

    await UpdateCommand();

    expect(mockProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    expect(mockProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
  });

  it('should show success message after successful update', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    // Mock successful update
    mockProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0); // Success
      }
    });

    await UpdateCommand();

    // Note: The success message is logged within the promise, 
    // so we need to wait for it to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(console.log).toHaveBeenCalledWith('✅ Update successful!');
    expect(console.log).toHaveBeenCalledWith('\n🎉 Basic CLI has been updated to the latest version.');
    expect(console.log).toHaveBeenCalledWith('💡 Run `basic version` to verify the update.');
  });
}); 