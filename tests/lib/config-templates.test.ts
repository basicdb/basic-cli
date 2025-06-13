import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateConfigContent, 
  CONFIG_TEMPLATES,
  createConfigFile,
  checkForExistingConfig,
  readExistingConfig
} from '../../src/lib/config-templates';
import * as fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn()
}));

describe('config-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CONFIG_TEMPLATES', () => {
    it('contains all expected templates', () => {
      expect(CONFIG_TEMPLATES).toHaveProperty('typescript');
      expect(CONFIG_TEMPLATES).toHaveProperty('javascript');
      expect(CONFIG_TEMPLATES).toHaveProperty('none');
    });

    it('has correct template structure', () => {
      const template = CONFIG_TEMPLATES.typescript;
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('filename');
      expect(template).toHaveProperty('extension');
    });
  });

  describe('generateConfigContent', () => {
    const projectId = 'test-project-id';
    const projectName = 'Test Project';

    it('generates TypeScript config correctly', () => {
      const content = generateConfigContent('typescript', projectId, projectName);
      
      expect(content).toContain('// Basic Project Configuration');
      expect(content).toContain('// see the docs for more info: https://docs.basic.tech');
      expect(content).toContain('const schema =');
      expect(content).toContain(projectId);
      expect(content).toContain('export default schema');
    });

    it('generates JavaScript config correctly', () => {
      const content = generateConfigContent('javascript', projectId, projectName);
      
      expect(content).toContain('// Basic Project Configuration');
      expect(content).toContain('// see the docs for more info: https://docs.basic.tech');
      expect(content).toContain('const schema =');
      expect(content).toContain(projectId);
      expect(content).toContain('module.exports = schema');
    });

    it('returns empty string for none template', () => {
      const content = generateConfigContent('none', projectId, projectName);
      expect(content).toBe('');
    });

    it('throws error for unknown template', () => {
      expect(() => {
        generateConfigContent('unknown' as any, projectId, projectName);
      }).toThrow('Unknown template: unknown');
    });

    it('includes correct base config structure', () => {
      const content = generateConfigContent('typescript', projectId, projectName);
      const parsed = content.match(/const schema = ({[\s\S]*?});/)?.[1];
      
      expect(parsed).toBeDefined();
      if (parsed) {
        const config = JSON.parse(parsed);
        expect(config).toEqual({
          project_id: projectId,
          version: 0,
          tables: {
            example: {
              type: 'collection',
              fields: {
                value: {
                  type: 'string'
                }
              }
            }
          }
        });
      }
    });
  });

  describe('createConfigFile', () => {
    const projectId = 'test-project-id';
    const projectName = 'Test Project';
    const targetDir = '/test/dir';

    it('creates TypeScript config file successfully', async () => {
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await createConfigFile('typescript', projectId, projectName, targetDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/dir/basic.config.ts',
        expect.stringContaining('const schema ='),
        'utf8'
      );
      expect(result).toBe('/test/dir/basic.config.ts');
    });

    it('creates JavaScript config file successfully', async () => {
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await createConfigFile('javascript', projectId, projectName, targetDir);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/dir/basic.config.js',
        expect.stringContaining('const schema ='),
        'utf8'
      );
      expect(result).toBe('/test/dir/basic.config.js');
    });

    it('returns null for none template', async () => {
      const result = await createConfigFile('none', projectId, projectName, targetDir);

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('handles file write errors', async () => {
      (fs.writeFile as any).mockRejectedValue(new Error('Permission denied'));

      await expect(
        createConfigFile('typescript', projectId, projectName, targetDir)
      ).rejects.toThrow('Failed to create config file: Permission denied');
    });
  });

  describe('checkForExistingConfig', () => {
    it('returns path when config file exists', async () => {
      (fs.access as any).mockResolvedValueOnce(undefined);

      const result = await checkForExistingConfig('/test/dir');

      expect(result).toBe('/test/dir/basic.config.ts');
      expect(fs.access).toHaveBeenCalledWith('/test/dir/basic.config.ts');
    });

    it('returns null when no config file exists', async () => {
      (fs.access as any).mockRejectedValue(new Error('ENOENT'));

      const result = await checkForExistingConfig('/test/dir');

      expect(result).toBeNull();
    });

    it('checks all possible config files', async () => {
      (fs.access as any)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const result = await checkForExistingConfig('/test/dir');

      expect(result).toBe('/test/dir/basic.config.json');
      expect(fs.access).toHaveBeenCalledTimes(3);
    });
  });

  describe('readExistingConfig', () => {
    it('reads JSON config file correctly', async () => {
      const configContent = JSON.stringify({ project_id: 'test-id' });
      (fs.access as any).mockResolvedValueOnce(undefined);
      (fs.readFile as any).mockResolvedValue(configContent);

      const result = await readExistingConfig('/test/dir');

      expect(result).toEqual({ projectId: 'test-id' });
    });

    it('reads TypeScript config file correctly', async () => {
      const configContent = `
        const schema = {
          "project_id": "test-id",
          version: 0
        };
      `;
      (fs.access as any).mockResolvedValueOnce(undefined);
      (fs.readFile as any).mockResolvedValue(configContent);

      const result = await readExistingConfig('/test/dir');

      expect(result).toEqual({ projectId: 'test-id' });
    });

    it('returns null when no config file exists', async () => {
      (fs.access as any).mockRejectedValue(new Error('ENOENT'));

      const result = await readExistingConfig('/test/dir');

      expect(result).toBeNull();
    });

    it('handles read errors', async () => {
      (fs.access as any).mockResolvedValueOnce(undefined);
      (fs.readFile as any).mockRejectedValue(new Error('Permission denied'));

      await expect(
        readExistingConfig('/test/dir')
      ).rejects.toThrow('Failed to read existing config: Permission denied');
    });
  });
}); 