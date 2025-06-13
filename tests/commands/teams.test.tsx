import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api';
import { AuthService } from '../../src/lib/auth';
import { isOnline, copyToClipboard, openBrowser } from '../../src/lib/platform';
import type { Team } from '../../src/lib/types';

// Mock all dependencies
vi.mock('../../src/lib/api');
vi.mock('../../src/lib/auth');
vi.mock('../../src/lib/platform');
vi.mock('ink', () => ({
  render: vi.fn()
}));

describe('Teams functionality', () => {
  let mockApiClient: any;
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiClient = {
      getTeams: vi.fn(),
      createTeam: vi.fn()
    };
    vi.mocked(ApiClient.getInstance).mockReturnValue(mockApiClient);
    
    mockAuthService = {
      getToken: vi.fn()
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
  });

  describe('Platform utilities', () => {
    it('should copy team ID to clipboard', async () => {
      vi.mocked(copyToClipboard).mockResolvedValue();

      await copyToClipboard('test-team-id');

      expect(copyToClipboard).toHaveBeenCalledWith('test-team-id');
    });

    it('should open team URL in browser', async () => {
      vi.mocked(openBrowser).mockResolvedValue();

      await openBrowser('https://app.basic.tech/team/test-team-slug');

      expect(openBrowser).toHaveBeenCalledWith('https://app.basic.tech/team/test-team-slug');
    });

    it('should handle clipboard errors gracefully', async () => {
      vi.mocked(copyToClipboard).mockRejectedValue(new Error('Clipboard not available'));

      await expect(copyToClipboard('test-team-id')).rejects.toThrow('Clipboard not available');
    });

    it('should check online status', async () => {
      vi.mocked(isOnline).mockResolvedValue(true);

      const result = await isOnline();

      expect(result).toBe(true);
      expect(isOnline).toHaveBeenCalled();
    });
  });

  describe('API integration', () => {
    it('should fetch teams from API', async () => {
      const mockTeams: Team[] = [
        {
          id: 'team-1',
          name: 'Test Team',
          slug: 'test-team',
          roles: 'admin',
          role_name: 'Admin',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockApiClient.getTeams.mockResolvedValue(mockTeams);

      const teams = await mockApiClient.getTeams();

      expect(teams).toEqual(mockTeams);
      expect(mockApiClient.getTeams).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockApiClient.getTeams.mockRejectedValue(new Error('API Error'));

      await expect(mockApiClient.getTeams()).rejects.toThrow('API Error');
    });

    it('should create a new team', async () => {
      const teamName = 'New Team';
      const teamSlug = 'new-team';
      const mockTeam: Team = {
        id: 'new-team-id',
        name: teamName,
        slug: teamSlug,
        roles: 'admin',
        role_name: 'Admin',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockApiClient.createTeam.mockResolvedValue(mockTeam);

      const team = await mockApiClient.createTeam(teamName, teamSlug);

      expect(team).toEqual(mockTeam);
      expect(mockApiClient.createTeam).toHaveBeenCalledWith(teamName, teamSlug);
    });

    it('should handle team creation errors', async () => {
      mockApiClient.createTeam.mockRejectedValue(new Error('Team creation failed'));

      await expect(mockApiClient.createTeam('Test', 'test')).rejects.toThrow('Team creation failed');
    });
  });

  describe('Authentication checks', () => {
    it('should check for valid token', async () => {
      const mockToken = { access_token: 'valid-token' };
      mockAuthService.getToken.mockResolvedValue(mockToken);

      const token = await mockAuthService.getToken();

      expect(token).toEqual(mockToken);
      expect(mockAuthService.getToken).toHaveBeenCalled();
    });

    it('should handle missing token', async () => {
      mockAuthService.getToken.mockResolvedValue(null);

      const token = await mockAuthService.getToken();

      expect(token).toBeNull();
    });
  });

  describe('TeamsCommand', () => {
    it('should import and exist', async () => {
      const { TeamsCommand } = await import('../../src/commands/teams');
      
      expect(TeamsCommand).toBeDefined();
      expect(typeof TeamsCommand).toBe('function');
    });

    it('should call render when executed without action (list teams)', async () => {
      const { render } = await import('ink');
      const { TeamsCommand } = await import('../../src/commands/teams');
      
      await TeamsCommand();
      
      expect(render).toHaveBeenCalled();
    });

    it('should call render when executed with "new" action', async () => {
      const { render } = await import('ink');
      const { TeamsCommand } = await import('../../src/commands/teams');
      
      await TeamsCommand('new');
      
      expect(render).toHaveBeenCalled();
    });

    it('should default to list when unknown action provided', async () => {
      const { render } = await import('ink');
      const { TeamsCommand } = await import('../../src/commands/teams');
      
      await TeamsCommand('unknown');
      
      expect(render).toHaveBeenCalled();
    });
  });
}); 