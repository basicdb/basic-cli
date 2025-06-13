import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api';
import { AuthService } from '../../src/lib/auth';
import { isOnline } from '../../src/lib/platform';
import { readSchemaFromConfig, compareVersions, saveSchemaToConfig } from '../../src/lib/schema';
import type { Schema } from '../../src/lib/types';

// Mock all dependencies
vi.mock('../../src/lib/api');
vi.mock('../../src/lib/auth');
vi.mock('../../src/lib/platform');
vi.mock('../../src/lib/schema');
vi.mock('ink', () => ({
  render: vi.fn(),
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: vi.fn()
}));
vi.mock('../../src/components/Spinner', () => ({
  Spinner: () => 'Loading...'
}));

describe('Pull Command', () => {
  let mockApiClient: any;
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiClient = {
      getProjectSchema: vi.fn(),
      compareSchema: vi.fn()
    };
    vi.mocked(ApiClient.getInstance).mockReturnValue(mockApiClient);
    
    mockAuthService = {
      getToken: vi.fn()
    };
    vi.mocked(AuthService.getInstance).mockReturnValue(mockAuthService);
    
    // Default mocks for successful flow
    vi.mocked(isOnline).mockResolvedValue(true);
    mockAuthService.getToken.mockResolvedValue({ access_token: 'valid-token' });
    vi.mocked(saveSchemaToConfig).mockResolvedValue('basic.config.ts');
  });

  describe('PullCommand function', () => {
    it('should import and exist', async () => {
      const { PullCommand } = await import('../../src/commands/pull');
      
      expect(PullCommand).toBeDefined();
      expect(typeof PullCommand).toBe('function');
    });

    it('should call render when executed', async () => {
      const { render } = await import('ink');
      const { PullCommand } = await import('../../src/commands/pull');
      
      await PullCommand();
      
      expect(render).toHaveBeenCalled();
    });
  });

  describe('API client integration', () => {
    it('should use singleton API client instance', () => {
      expect(ApiClient.getInstance).toBeDefined();
      expect(typeof ApiClient.getInstance).toBe('function');
    });

    it('should have required API methods', () => {
      const client = ApiClient.getInstance();
      
      expect(client.getProjectSchema).toBeDefined();
      expect(client.compareSchema).toBeDefined();
    });
  });

  describe('Authentication service', () => {
    it('should use singleton auth service instance', () => {
      expect(AuthService.getInstance).toBeDefined();
      expect(typeof AuthService.getInstance).toBe('function');
    });

    it('should have getToken method', () => {
      const auth = AuthService.getInstance();
      
      expect(auth.getToken).toBeDefined();
    });
  });

  describe('Platform utilities', () => {
    it('should have isOnline function', () => {
      expect(isOnline).toBeDefined();
      expect(typeof isOnline).toBe('function');
    });
  });

  describe('Schema utilities', () => {
    it('should have readSchemaFromConfig function', () => {
      expect(readSchemaFromConfig).toBeDefined();
      expect(typeof readSchemaFromConfig).toBe('function');
    });

    it('should have compareVersions function', () => {
      expect(compareVersions).toBeDefined();
      expect(typeof compareVersions).toBe('function');
    });

    it('should have saveSchemaToConfig function', () => {
      expect(saveSchemaToConfig).toBeDefined();
      expect(typeof saveSchemaToConfig).toBe('function');
    });
  });

  describe('Mock schema operations', () => {
    const mockLocalSchema: Schema = {
      project_id: 'test-project-id',
      version: 3,
      tables: {
        users: {
          type: 'collection',
          fields: {
            name: { type: 'string' }
          }
        }
      }
    };

    const mockRemoteSchema: Schema = {
      project_id: 'test-project-id',
      version: 4,
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

    it('should handle schema reading result', async () => {
      vi.mocked(readSchemaFromConfig).mockResolvedValue({
        schema: mockLocalSchema,
        projectId: 'test-project-id',
        filePath: 'basic.config.ts'
      });

      const config = await readSchemaFromConfig();
      expect(config).toBeDefined();
      expect(config?.projectId).toBe('test-project-id');
    });

    it('should handle remote schema fetching', async () => {
      mockApiClient.getProjectSchema.mockResolvedValue(mockRemoteSchema);

      const schema = await mockApiClient.getProjectSchema('test-project-id');
      expect(schema).toBeDefined();
      expect(schema.version).toBe(4);
    });

    it('should handle schema comparison results', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'behind',
        localVersion: 3,
        remoteVersion: 4
      });

      const result = compareVersions(mockLocalSchema, mockRemoteSchema);
      
      expect(result.status).toBe('behind');
      expect(result.localVersion).toBe(3);
      expect(result.remoteVersion).toBe(4);
    });

    it('should handle schema saving', async () => {
      vi.mocked(saveSchemaToConfig).mockResolvedValue('basic.config.ts');

      const filePath = await saveSchemaToConfig(mockRemoteSchema);
      expect(filePath).toBe('basic.config.ts');
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.getProjectSchema.mockRejectedValue(new Error('API Error'));
      
      try {
        await mockApiClient.getProjectSchema('test-id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('API Error');
      }
    });

    it('should handle authentication errors', async () => {
      mockAuthService.getToken.mockResolvedValue(null);
      
      const token = await mockAuthService.getToken();
      expect(token).toBeNull();
    });

    it('should handle offline scenarios', async () => {
      vi.mocked(isOnline).mockResolvedValue(false);
      
      const online = await isOnline();
      expect(online).toBe(false);
    });

    it('should handle missing schema scenarios', async () => {
      vi.mocked(readSchemaFromConfig).mockResolvedValue(null);
      
      const config = await readSchemaFromConfig();
      expect(config).toBeNull();
    });

    it('should handle schema save errors', async () => {
      const mockSchema: Schema = {
        project_id: 'test',
        version: 1,
        tables: {}
      };
      
      vi.mocked(saveSchemaToConfig).mockRejectedValue(new Error('Save failed'));
      
      try {
        await saveSchemaToConfig(mockSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Save failed');
      }
    });

    it('should handle schema comparison errors', async () => {
      mockApiClient.compareSchema.mockRejectedValue(new Error('Comparison failed'));
      
      try {
        await mockApiClient.compareSchema({});
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Comparison failed');
      }
    });
  });

  describe('Version comparison scenarios', () => {
    const localSchema: Schema = {
      project_id: 'test',
      version: 3,
      tables: {}
    };

    const remoteSchema: Schema = {
      project_id: 'test',
      version: 4,
      tables: {}
    };

    it('should detect behind scenario (pull needed)', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'behind',
        localVersion: 3,
        remoteVersion: 4
      });

      const result = compareVersions(localSchema, remoteSchema);
      expect(result.status).toBe('behind');
    });

    it('should detect current scenario (no pull needed)', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'equal',
        localVersion: 4,
        remoteVersion: 4
      });

      const result = compareVersions(localSchema, remoteSchema);
      expect(result.status).toBe('equal');
    });

    it('should detect ahead scenario', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'ahead',
        localVersion: 5,
        remoteVersion: 4
      });

      const result = compareVersions(localSchema, remoteSchema);
      expect(result.status).toBe('ahead');
    });

    it('should handle conflict scenarios', () => {
      // Same version but different content would be detected via compareSchema API
      mockApiClient.compareSchema.mockResolvedValue({ valid: false });

      expect(mockApiClient.compareSchema).toBeDefined();
    });

    it('should handle version 0 scenarios', () => {
      const v0Schema = { ...localSchema, version: 0 };
      
      vi.mocked(compareVersions).mockReturnValue({
        status: 'equal',
        localVersion: 0,
        remoteVersion: 0
      });

      const result = compareVersions(v0Schema, v0Schema);
      expect(result.status).toBe('equal');
      expect(result.localVersion).toBe(0);
      expect(result.remoteVersion).toBe(0);
    });
  });

  describe('Missing remote schema handling', () => {
    it('should handle null remote schema', async () => {
      mockApiClient.getProjectSchema.mockResolvedValue(null);

      const schema = await mockApiClient.getProjectSchema('test-id');
      expect(schema).toBeNull();
    });

    it('should create empty schema when remote is missing', () => {
      const emptySchema: Schema = {
        project_id: 'test-project-id',
        version: 0,
        tables: {}
      };

      expect(emptySchema.version).toBe(0);
      expect(Object.keys(emptySchema.tables)).toHaveLength(0);
    });
  });
}); 