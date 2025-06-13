import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountCommand } from '../../src/commands/account';
import { AuthService } from '../../src/lib/auth';
import { isOnline } from '../../src/lib/platform';
import { MESSAGES } from '../../src/lib/constants';
import type { UserInfo } from '../../src/lib/types';

// Mock dependencies
vi.mock('../../src/lib/auth');
vi.mock('../../src/lib/platform');

describe('AccountCommand', () => {
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AuthService with all required methods
    mockAuthService = {
      getToken: vi.fn(),
      getUserInfo: vi.fn()
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
    
    // Mock console.log to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should check if user is online before fetching account info', async () => {
    vi.mocked(isOnline).mockResolvedValue(false);

    await expect(AccountCommand()).rejects.toThrow(MESSAGES.OFFLINE);
    
    expect(isOnline).toHaveBeenCalled();
    expect(mockAuthService.getToken).not.toHaveBeenCalled();
  });

  it('should display user account information', async () => {
    const mockUserInfo: UserInfo = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      token_type: 'Bearer'
    });
    mockAuthService.getUserInfo.mockResolvedValue(mockUserInfo);

    await AccountCommand();

    expect(mockAuthService.getToken).toHaveBeenCalled();
    expect(mockAuthService.getUserInfo).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Logged in user:', 'test@example.com');
  });

  it('should handle not logged in case', async () => {
    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue(null);

    await expect(AccountCommand()).rejects.toThrow(MESSAGES.LOGGED_OUT);
    
    expect(mockAuthService.getToken).toHaveBeenCalled();
    expect(mockAuthService.getUserInfo).not.toHaveBeenCalled();
  });

  it('should handle authentication errors', async () => {
    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      token_type: 'Bearer'
    });
    mockAuthService.getUserInfo.mockRejectedValue(new Error('API error'));

    await expect(AccountCommand()).rejects.toThrow('API error');
    
    expect(mockAuthService.getUserInfo).toHaveBeenCalled();
  });
}); 