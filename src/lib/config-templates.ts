import * as fs from 'fs/promises';
import * as path from 'path';
import type { ConfigTemplate, ConfigTemplateInfo } from './types';

export const CONFIG_TEMPLATES: Record<ConfigTemplate, ConfigTemplateInfo> = {
  typescript: {
    name: 'TypeScript',
    description: '',
    filename: 'basic.config.ts',
    extension: 'ts'
  },
  javascript: {
    name: 'JavaScript',
    description: '',
    filename: 'basic.config.js',
    extension: 'js'
  },
  none: {
    name: 'None',
    description: 'No configuration file',
    filename: '',
    extension: ''
  }
};

export function generateConfigContent(template: ConfigTemplate, projectId: string, projectName: string): string {
  const baseConfig = {
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
  };

  switch (template) {
    case 'typescript':
      return `// Basic Project Configuration
// see the docs for more info: https://docs.basic.tech

const schema = ${JSON.stringify(baseConfig, null, 2)};

export default schema;
`;

    case 'javascript':
      return `// Basic Project Configuration
// see the docs for more info: https://docs.basic.tech

const schema = ${JSON.stringify(baseConfig, null, 2)};

module.exports = schema;
`;

    case 'none':
      return '';

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

export async function createConfigFile(
  template: ConfigTemplate, 
  projectId: string, 
  projectName: string, 
  targetDir: string = process.cwd()
): Promise<string | null> {
  if (template === 'none') {
    return null;
  }

  const templateInfo = CONFIG_TEMPLATES[template];
  const configPath = path.join(targetDir, templateInfo.filename);
  const content = generateConfigContent(template, projectId, projectName);

  try {
    await fs.writeFile(configPath, content, 'utf8');
    return configPath;
  } catch (error) {
    throw new Error(`Failed to create config file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function checkForExistingConfig(targetDir: string = process.cwd()): Promise<string | null> {
  const possibleConfigs = [
    'basic.config.ts',
    'basic.config.js',
    'basic.config.json'
  ];

  for (const filename of possibleConfigs) {
    const filePath = path.join(targetDir, filename);
    try {
      await fs.access(filePath);
      return filePath; // File exists
    } catch {
      // File doesn't exist, continue checking
    }
  }

  return null; // No config file found
}

export async function readExistingConfig(targetDir: string = process.cwd()): Promise<{ projectId: string } | null> {
  const configPath = await checkForExistingConfig(targetDir);
  if (!configPath) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, 'utf8');
    
    // Try to parse as JSON first
    if (configPath.endsWith('.json')) {
      const config = JSON.parse(content);
      return { projectId: config.project_id };
    }

    // For .js/.ts files, try to extract project_id using regex
    const projectIdMatch = content.match(/["']?project_id["']?\s*:\s*["']([^"']+)["']/);
    if (projectIdMatch) {
      return { projectId: projectIdMatch[1] };
    }

    return null;
  } catch (error) {
    throw new Error(`Failed to read existing config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 