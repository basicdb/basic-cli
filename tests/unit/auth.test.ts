import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { AuthService } from '../../src/lib/auth';
import { AuthError } from '../../src/lib/errors';
import type { Token, UserInfo } from '../../src/lib/types';

// Mock dependencies
vi.mock('fs');
vi.mock('../../src/lib/platform');

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    authService = AuthService.getInstance();
    
    // Reset singleton instance for clean tests
    (AuthService as any).instance = undefined;
    authService = AuthService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getToken', () => {
    it('should return null when token file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });
      
      const token = await authService.getToken();
      
      expect(token).toBeNull();
    });

    it('should return valid token when file exists and not expired', async () => {
      const mockToken: Token = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000, // 1 hour from now
        token_type: 'Bearer'
      };
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockToken));
      
      const token = await authService.getToken();
      
      expect(token).toEqual(mockToken);
    });

    it('should refresh token when expired', async () => {
      const expiredToken: Token = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() - 1000, // Expired
        token_type: 'Bearer'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(expiredToken));
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      
      // Mock the refresh token API call
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer'
        })
      } as Response);

      const token = await authService.getToken();
      
      expect(token?.access_token).toBe('new-token');
      expect(fs.writeFile).toHaveBeenCalled(); // Should save refreshed token
    });

    it('should handle JSON parse errors', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid-json');
      
      await expect(authService.getToken()).rejects.toThrow();
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info with valid token', async () => {
      const mockToken: Token = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer'
      };

      const mockUserInfo: UserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockToken));
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo)
      } as Response);

      const userInfo = await authService.getUserInfo();

      expect(userInfo).toEqual(mockUserInfo);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.basic.tech/auth/userInfo',
        {
          headers: {
            Authorization: 'Bearer valid-token'
          }
        }
      );
    });

    it('should throw AuthError when not logged in', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });

      await expect(authService.getUserInfo()).rejects.toThrow(AuthError);
      await expect(authService.getUserInfo()).rejects.toThrow('Not logged in');
    });

    it('should throw AuthError when API call fails', async () => {
      const mockToken: Token = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockToken));
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401
      } as Response);

      await expect(authService.getUserInfo()).rejects.toThrow(AuthError);
      await expect(authService.getUserInfo()).rejects.toThrow('Failed to fetch user info');
    });
  });

  describe('logout', () => {
    it('should call unlink to delete token file', async () => {
      vi.mocked(fs.unlink).mockResolvedValue();

      await authService.logout();

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should handle file not found error gracefully', async () => {
      vi.mocked(fs.unlink).mockRejectedValue({ code: 'ENOENT' });

      await expect(authService.logout()).resolves.not.toThrow();
    });

    it('should throw other file system errors', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('Permission denied'));

      await expect(authService.logout()).rejects.toThrow();
    });
  });
}); 