import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogoutCommand } from '../../src/commands/logout';
import { AuthService } from '../../src/lib/auth';

// Mock dependencies
vi.mock('../../src/lib/auth');

describe('LogoutCommand', () => {
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AuthService
    mockAuthService = {
      logout: vi.fn()
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
    
    // Mock console.log to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should successfully logout', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);

    await LogoutCommand();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Logged out successfully');
  });

  it('should handle logout errors', async () => {
    const error = new Error('Failed to delete token file');
    mockAuthService.logout.mockRejectedValue(error);

    await expect(LogoutCommand()).rejects.toThrow('Failed to delete token file');
    
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
}); 