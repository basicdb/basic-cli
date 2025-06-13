import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginCommand } from '../../src/commands/login';
import { AuthService } from '../../src/lib/auth';
import { isOnline } from '../../src/lib/platform';
import { MESSAGES } from '../../src/lib/constants';

// Mock dependencies
vi.mock('../../src/lib/auth');
vi.mock('../../src/lib/platform');

describe('LoginCommand', () => {
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AuthService
    mockAuthService = {
      getToken: vi.fn(),
      login: vi.fn()
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
    
    // Mock console.log to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should check if user is online before attempting login', async () => {
    vi.mocked(isOnline).mockResolvedValue(false);

    await expect(LoginCommand()).rejects.toThrow(MESSAGES.OFFLINE);
    
    expect(isOnline).toHaveBeenCalled();
    expect(mockAuthService.getToken).not.toHaveBeenCalled();
  });

  it('should show message when already logged in', async () => {
    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue({
      access_token: 'existing-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      token_type: 'Bearer'
    });

    await LoginCommand();

    expect(console.log).toHaveBeenCalledWith('Already logged in with a valid token.');
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('should perform login flow when not logged in', async () => {
    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue(null);
    mockAuthService.login.mockResolvedValue(undefined);

    await LoginCommand();

    expect(console.log).toHaveBeenCalledWith('🔐 Opening browser for login...');
    expect(mockAuthService.login).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('✅ Login successful! Hello :)');
  });

  it('should handle login errors', async () => {
    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue(null);
    mockAuthService.login.mockRejectedValue(new Error('OAuth failed'));

    await expect(LoginCommand()).rejects.toThrow('OAuth failed');
    
    expect(mockAuthService.login).toHaveBeenCalled();
  });
}); 