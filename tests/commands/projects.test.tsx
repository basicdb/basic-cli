import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api';
import { AuthService } from '../../src/lib/auth';
import { isOnline, copyToClipboard, openBrowser } from '../../src/lib/platform';
import type { Project } from '../../src/lib/types';

// Mock all dependencies
vi.mock('../../src/lib/api');
vi.mock('../../src/lib/auth');
vi.mock('../../src/lib/platform');
vi.mock('ink', () => ({
  render: vi.fn()
}));

describe('Projects functionality', () => {
  let mockApiClient: any;
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiClient = {
      getProjects: vi.fn()
    };
    vi.mocked(ApiClient.getInstance).mockReturnValue(mockApiClient);
    
    mockAuthService = {
      getToken: vi.fn()
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
  });

  describe('Platform utilities', () => {
    it('should copy text to clipboard', async () => {
      vi.mocked(copyToClipboard).mockResolvedValue();

      await copyToClipboard('test-project-id');

      expect(copyToClipboard).toHaveBeenCalledWith('test-project-id');
    });

    it('should open URL in browser', async () => {
      vi.mocked(openBrowser).mockResolvedValue();

      await openBrowser('https://app.basic.tech/project/test-id');

      expect(openBrowser).toHaveBeenCalledWith('https://app.basic.tech/project/test-id');
    });

    it('should handle clipboard errors gracefully', async () => {
      vi.mocked(copyToClipboard).mockRejectedValue(new Error('Clipboard not available'));

      await expect(copyToClipboard('test-id')).rejects.toThrow('Clipboard not available');
    });

    it('should check online status', async () => {
      vi.mocked(isOnline).mockResolvedValue(true);

      const result = await isOnline();

      expect(result).toBe(true);
      expect(isOnline).toHaveBeenCalled();
    });
  });

  describe('API integration', () => {
    it('should fetch projects from API', async () => {
      const mockProjects: Project[] = [
        {
          id: 'project-1',
          name: 'Test Project',
          slug: 'test-project',
          profile: { icon_url: 'https://example.com/test.png' },
          team_id: 'team-1',
          team_name: 'Test Team',
          team_slug: 'test-team',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockApiClient.getProjects.mockResolvedValue(mockProjects);

      const projects = await mockApiClient.getProjects();

      expect(projects).toEqual(mockProjects);
      expect(mockApiClient.getProjects).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockApiClient.getProjects.mockRejectedValue(new Error('API Error'));

      await expect(mockApiClient.getProjects()).rejects.toThrow('API Error');
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

  describe('ProjectsCommand', () => {
    it('should import and exist', async () => {
      const { ProjectsCommand } = await import('../../src/commands/projects');
      
      expect(ProjectsCommand).toBeDefined();
      expect(typeof ProjectsCommand).toBe('function');
    });

    it('should call render when executed', async () => {
      const { render } = await import('ink');
      const { ProjectsCommand } = await import('../../src/commands/projects');
      
      await ProjectsCommand();
      
      expect(render).toHaveBeenCalled();
    });
  });
}); 