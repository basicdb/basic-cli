import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api';
import { AuthService } from '../../src/lib/auth';
import { ApiError } from '../../src/lib/errors';
import { CONSTANTS } from '../../src/lib/constants';
import type { Project, Team, Schema, ValidationResult, CreateProjectData, Token } from '../../src/lib/types';

// Mock dependencies
vi.mock('../../src/lib/auth');

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAuthService: any;
  let mockToken: Token;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset singleton instance
    (ApiClient as any).instance = undefined;
    
    // Mock token
    mockToken = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Date.now() + 3600000,
      token_type: 'Bearer'
    };
    
    // Mock AuthService
    mockAuthService = {
      getToken: vi.fn().mockResolvedValue(mockToken)
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
    
    // Create new instance after mocking
    apiClient = ApiClient.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ApiClient.getInstance();
      const instance2 = ApiClient.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('request method', () => {
    it('should make authenticated requests with proper headers', async () => {
      const mockResponse = { data: [] };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      await apiClient.getProjects();

      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/project`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token'
          }
        }
      );
    });

    it('should make unauthenticated requests when no token', async () => {
      // Mock getToken to return null for this test
      mockAuthService.getToken.mockResolvedValueOnce(null);
      
      const mockResponse = { data: [] };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      await apiClient.getProjects();

      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/project`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle API errors with status codes', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      } as Response);

      await expect(apiClient.getProjects()).rejects.toThrow(ApiError);
      await expect(apiClient.getProjects()).rejects.toThrow('API Error: 401 - Unauthorized');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(apiClient.getProjects()).rejects.toThrow();
    });
  });

  describe('getProjects', () => {
    it('should fetch and return projects', async () => {
      const mockProjects: Project[] = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          slug: 'test-project-1',
          profile: { icon_url: 'https://example.com/icon1.png' },
          team_id: 'team-1',
          team_name: 'Test Team 1',
          team_slug: 'test-team-1',
          created_at: new Date().toISOString()
        },
        {
          id: 'project-2',
          name: 'Test Project 2',
          slug: 'test-project-2',
          profile: { icon_url: 'https://example.com/icon2.png' },
          team_id: 'team-2',
          team_name: 'Test Team 2',
          team_slug: 'test-team-2',
          created_at: new Date().toISOString()
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockProjects })
      } as Response);

      const projects = await apiClient.getProjects();

      expect(projects).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/project`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const projectData: CreateProjectData = {
        name: 'New Project',
        slug: 'new-project',
        team_id: 'team-1'
      };

      const mockProject: Project = {
        id: 'new-project-id',
        name: projectData.name,
        slug: projectData.slug,
        profile: { icon_url: 'https://example.com/new-project.png' },
        team_id: projectData.team_id,
        team_name: 'Test Team',
        team_slug: 'test-team',
        created_at: new Date().toISOString()
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockProject })
      } as Response);

      const project = await apiClient.createProject(projectData);

      expect(project).toEqual(mockProject);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/project`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(projectData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('getTeams', () => {
    it('should fetch and return teams', async () => {
      const mockTeams: Team[] = [
        {
          id: 'team-1',
          name: 'Test Team',
          slug: 'test-team',
          created_at: new Date().toISOString()
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTeams })
      } as Response);

      const teams = await apiClient.getTeams();

      expect(teams).toEqual(mockTeams);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/team`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('createTeam', () => {
    it('should create a new team', async () => {
      const teamName = 'New Team';
      const teamSlug = 'new-team';

      const mockTeam: Team = {
        id: 'new-team-id',
        name: teamName,
        slug: teamSlug,
        created_at: new Date().toISOString()
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTeam })
      } as Response);

      const team = await apiClient.createTeam(teamName, teamSlug);

      expect(team).toEqual(mockTeam);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/team`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: teamName, slug: teamSlug }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('getProjectSchema', () => {
    it('should fetch and return project schema', async () => {
      const projectId = 'project-1';
      const mockSchema: Schema = {
        project_id: projectId,
        version: 1,
        tables: {
          users: {
            type: 'collection',
            fields: {
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ schema: mockSchema }] })
      } as Response);

      const schema = await apiClient.getProjectSchema(projectId);

      expect(schema).toEqual(mockSchema);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/project/${projectId}/schema`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });

    it('should return null when no schema exists', async () => {
      const projectId = 'project-1';

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      } as Response);

      const schema = await apiClient.getProjectSchema(projectId);

      expect(schema).toBeNull();
    });

    it('should return null on 404 error', async () => {
      const projectId = 'project-1';

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found')
      } as Response);

      const schema = await apiClient.getProjectSchema(projectId);

      expect(schema).toBeNull();
    });

    it('should throw on other errors', async () => {
      const projectId = 'project-1';

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as Response);

      await expect(apiClient.getProjectSchema(projectId)).rejects.toThrow(ApiError);
    });
  });

  describe('pushProjectSchema', () => {
    it('should push schema to project', async () => {
      const projectId = 'project-1';
      const schema: Schema = {
        project_id: projectId,
        version: 2,
        tables: {
          users: {
            type: 'collection',
            fields: {
              name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      await apiClient.pushProjectSchema(projectId, schema);

      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/project/${projectId}/schema`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ schema }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('validateSchema', () => {
    it('should validate schema and return result', async () => {
      const schema: Schema = {
        project_id: 'project-1',
        version: 1,
        tables: {}
      };

      const mockValidationResult: ValidationResult = {
        valid: true,
        errors: []
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockValidationResult)
      } as Response);

      const result = await apiClient.validateSchema(schema);

      expect(result).toEqual(mockValidationResult);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/utils/schema/verifyUpdateSchema`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ schema }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('compareSchema', () => {
    it('should compare schema and return result', async () => {
      const schema: Schema = {
        project_id: 'project-1',
        version: 1,
        tables: {}
      };

      const mockCompareResult = { valid: true };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCompareResult)
      } as Response);

      const result = await apiClient.compareSchema(schema);

      expect(result).toEqual(mockCompareResult);
      expect(fetch).toHaveBeenCalledWith(
        `${CONSTANTS.API_BASE}/utils/schema/compareSchema`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ schema }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('checkLatestRelease', () => {
    it('should fetch latest version from npm', async () => {
      const mockNpmResponse = {
        version: '1.2.3'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNpmResponse)
      } as Response);

      const version = await apiClient.checkLatestRelease();

      expect(version).toBe('1.2.3');
      expect(fetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@basictech/cli/latest'
      );
    });

    it('should handle npm registry errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404
      } as Response);

      await expect(apiClient.checkLatestRelease()).rejects.toThrow('Failed to check for updates');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(apiClient.checkLatestRelease()).rejects.toThrow();
    });
  });
}); 