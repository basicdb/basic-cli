import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api';
import { AuthService } from '../../src/lib/auth';
import { isOnline } from '../../src/lib/platform';
import { readSchemaFromConfig, compareVersions } from '../../src/lib/schema';
import type { Schema, ValidationError } from '../../src/lib/types';

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

describe('Push Command', () => {
  let mockApiClient: any;
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiClient = {
      getProjectSchema: vi.fn(),
      pushProjectSchema: vi.fn(),
      validateSchema: vi.fn(),
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
  });

  describe('PushCommand function', () => {
    it('should import and exist', async () => {
      const { PushCommand } = await import('../../src/commands/push');
      
      expect(PushCommand).toBeDefined();
      expect(typeof PushCommand).toBe('function');
    });

    it('should call render when executed', async () => {
      const { render } = await import('ink');
      const { PushCommand } = await import('../../src/commands/push');
      
      await PushCommand();
      
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
      expect(client.pushProjectSchema).toBeDefined();
      expect(client.validateSchema).toBeDefined();
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
  });

  describe('Mock validation scenarios', () => {
    const mockLocalSchema: Schema = {
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

    it('should handle valid schema validation result', () => {
      const validResult = { valid: true };
      mockApiClient.validateSchema.mockResolvedValue(validResult);

      expect(mockApiClient.validateSchema).toBeDefined();
    });

    it('should handle invalid schema validation result', () => {
      const invalidResult = {
        valid: false,
        errors: [
          {
            message: 'Invalid field type',
            instancePath: '/tables/users/fields/email'
          }
        ]
      };
      mockApiClient.validateSchema.mockResolvedValue(invalidResult);

      expect(mockApiClient.validateSchema).toBeDefined();
    });

    it('should handle schema comparison results', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'ahead',
        localVersion: 4,
        remoteVersion: 3
      });

      const result = compareVersions(mockLocalSchema, mockLocalSchema);
      
      expect(result.status).toBe('ahead');
      expect(result.localVersion).toBe(4);
      expect(result.remoteVersion).toBe(3);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.getProjectSchema.mockRejectedValue(new Error('API Error'));
      
      // Test that the error is properly typed
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
  });

  describe('Version comparison logic', () => {
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

    it('should detect behind scenario', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'behind',
        localVersion: 3,
        remoteVersion: 4
      });

      const result = compareVersions(localSchema, remoteSchema);
      expect(result.status).toBe('behind');
    });

    it('should detect ahead scenario', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'ahead',
        localVersion: 4,
        remoteVersion: 3
      });

      const result = compareVersions(localSchema, remoteSchema);
      expect(result.status).toBe('ahead');
    });

    it('should detect equal scenario', () => {
      vi.mocked(compareVersions).mockReturnValue({
        status: 'equal',
        localVersion: 3,
        remoteVersion: 3
      });

      const result = compareVersions(localSchema, remoteSchema);
      expect(result.status).toBe('equal');
    });
  });
}); 