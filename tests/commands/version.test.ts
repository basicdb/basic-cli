import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VersionCommand } from '../../src/commands/version';
import { getVersion } from '../../src/lib/version';
import { ApiClient } from '../../src/lib/api';

// Mock dependencies
vi.mock('../../src/lib/version');
vi.mock('../../src/lib/api');

describe('VersionCommand', () => {
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock ApiClient
    mockApiClient = {
      checkLatestRelease: vi.fn()
    };
    vi.mocked(ApiClient.getInstance).mockReturnValue(mockApiClient);
    
    // Mock console.log to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should display current version', async () => {
    const mockVersion = '1.0.0';
    vi.mocked(getVersion).mockReturnValue(mockVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(mockVersion);

    await VersionCommand();

    expect(getVersion).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(`basic-cli version ${mockVersion}`);
  });

  it('should show update available when newer version exists', async () => {
    const currentVersion = '1.0.0';
    const latestVersion = '1.1.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(latestVersion);

    await VersionCommand();

    expect(console.log).toHaveBeenCalledWith(`basic-cli version ${currentVersion}`);
    expect(console.log).toHaveBeenCalledWith(`New version available: ${latestVersion}`);
    expect(console.log).toHaveBeenCalledWith('\nPlease update with \'basic update\'');
  });

  it('should show latest version message when up to date', async () => {
    const currentVersion = '1.0.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockResolvedValue(currentVersion);

    await VersionCommand();

    expect(console.log).toHaveBeenCalledWith(`basic-cli version ${currentVersion}`);
    expect(console.log).toHaveBeenCalledWith('You are running the latest version!');
  });

  it('should handle API errors gracefully', async () => {
    const currentVersion = '1.0.0';
    
    vi.mocked(getVersion).mockReturnValue(currentVersion);
    mockApiClient.checkLatestRelease.mockRejectedValue(new Error('Network error'));

    await VersionCommand();

    expect(console.log).toHaveBeenCalledWith(`basic-cli version ${currentVersion}`);
    expect(console.log).toHaveBeenCalledWith('\nOopsy - could not check if new version is available.');
  });

  it('should handle when API returns same version', async () => {
    const version = '2.1.3';
    
    vi.mocked(getVersion).mockReturnValue(version);
    mockApiClient.checkLatestRelease.mockResolvedValue(version);

    await VersionCommand();

    expect(console.log).toHaveBeenCalledWith(`basic-cli version ${version}`);
    expect(console.log).toHaveBeenCalledWith('You are running the latest version!');
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('New version available'));
  });
}); 