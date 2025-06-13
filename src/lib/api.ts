import { CONSTANTS } from './constants';
import { AuthService } from './auth';
import { ApiError, handleError } from './errors';
import type { 
  Project, 
  Team, 
  Schema, 
  ValidationResult, 
  CreateProjectData 
} from './types';

export class ApiClient {
  private static instance: ApiClient;
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.authService.getToken();
      
      const response = await fetch(`${CONSTANTS.API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token.access_token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `API Error: ${response.status} - ${errorText}`,
          response.status
        );
      }

      return response.json() as T;
    } catch (error) {
      throw handleError(error);
    }
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.request<{ data: Project[] }>('/project');
    return response.data;
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await this.request<{ data: Project }>('/project', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async createProjectWithTeam(name: string, slug: string, teamId: string): Promise<Project> {
    const response = await this.request<{ data: Project }>('/project', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        slug, 
        team_id: teamId 
      }),
    });
    return response.data;
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await this.request<{ data: Project }>(`/project/${projectId}`);
    return response.data;
  }

  async getTeams(): Promise<Team[]> {
    const response = await this.request<{ data: Team[] }>('/team');
    return response.data;
  }

  async createTeam(name: string, slug: string): Promise<Team> {
    const response = await this.request<{ data: Team }>('/team', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    return response.data;
  }

  async checkTeamSlugAvailability(slug: string): Promise<boolean> {
    try {
      const response = await this.request<{ available: boolean }>(`/team/slug?slug=${encodeURIComponent(slug)}`);
      return response.available;
    } catch (error) {
      // If there's an error checking availability, assume it's not available
      return false;
    }
  }

  async getProjectSchema(projectId: string): Promise<Schema | null> {
    try {
      const response = await this.request<{ data: Array<{ schema: Schema }> }>(
        `/project/${projectId}/schema`
      );
      
      if (response.data.length === 0) {
        return null;
      }
      
      return response.data[0].schema;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async pushProjectSchema(projectId: string, schema: Schema): Promise<void> {
    await this.request(`/project/${projectId}/schema`, {
      method: 'POST',
      body: JSON.stringify({ schema }),
    });
  }

  async validateSchema(schema: Schema): Promise<ValidationResult> {
    const response = await this.request<ValidationResult>(
      '/utils/schema/verifyUpdateSchema',
      {
        method: 'POST',
        body: JSON.stringify({ schema }),
      }
    );
    return response;
  }

  async compareSchema(schema: Schema): Promise<{ valid: boolean }> {
    const response = await this.request<{ valid: boolean }>(
      '/utils/schema/compareSchema',
      {
        method: 'POST',
        body: JSON.stringify({ schema }),
      }
    );
    return response;
  }

  async checkLatestRelease(): Promise<string> {
    try {
      const response = await fetch(
        `https://registry.npmjs.org/@basictech/cli/latest`
      );
      
      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }
      
      const data = await response.json() as { version: string };
      return data.version;
    } catch (error) {
      throw handleError(error);
    }
  }
} 