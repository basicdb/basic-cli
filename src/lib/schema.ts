import * as fs from 'fs/promises';
import * as path from 'path';
import type { Schema } from './types';
import { parse } from '@babel/parser';
import type { 
  Node, 
  ObjectExpression, 
  ObjectProperty, 
  Identifier, 
  StringLiteral, 
  NumericLiteral, 
  BooleanLiteral, 
  NullLiteral, 
  File,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  VariableDeclaration,
  VariableDeclarator
} from '@babel/types';

export interface SchemaFileResult {
  schema: Schema;
  projectId: string;
  filePath: string;
}

/**
 * Read schema from local config files
 * Supports basic.config.ts, basic.config.js, and basic.config.json
 */
export async function readSchemaFromConfig(targetDir: string = process.cwd()): Promise<SchemaFileResult | null> {
  const possibleFiles = [
    'basic.config.ts',
    'basic.config.js', 
    'basic.config.json'
  ];

  for (const filename of possibleFiles) {
    const filePath = path.join(targetDir, filename);
    
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      let schema: Schema;
      
      if (filename.endsWith('.json')) {
        // Direct JSON parsing
        schema = JSON.parse(content);
      } else {
        // Extract schema from JS/TS files
        schema = extractSchemaFromCode(content);
      }
      
      // Validate required fields
      if (!schema.project_id) {
        throw new Error('No project_id found in schema');
      }
      
      return {
        schema,
        projectId: schema.project_id,
        filePath
      };
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        continue; // File doesn't exist, try next
      }
      throw new Error(`Error reading ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return null; // No config file found
}

/**
 * Extract schema object from TypeScript/JavaScript code using proper parsing
 */
export function extractSchemaFromCode(content: string): Schema {
  try {
    // Parse the file content using Babel parser
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    let schemaNode: Node | undefined;

    // 1. Handle 'export const schema = ...'
    ast.program.body.forEach(node => {
      if (node.type === 'ExportNamedDeclaration') {
        const declaration = (node as ExportNamedDeclaration).declaration;
        if (declaration?.type === 'VariableDeclaration') {
          const variable = (declaration as VariableDeclaration).declarations[0];
          if (variable.id.type === 'Identifier' && variable.id.name === 'schema' && variable.init) {
            schemaNode = variable.init;
          }
        }
      }
    });

    // 2. Handle 'export default schema' and 'export default { ... }'
    if (!schemaNode) {
      ast.program.body.forEach(node => {
        if (node.type === 'ExportDefaultDeclaration') {
          const declaration = (node as ExportDefaultDeclaration).declaration;
          if (declaration.type === 'Identifier' && declaration.name === 'schema') {
            // Find the variable declaration
            const schemaVar = ast.program.body.find(n => {
              if (n.type === 'VariableDeclaration') {
                const decl = (n as VariableDeclaration).declarations[0];
                return decl.id.type === 'Identifier' && decl.id.name === 'schema';
              }
              return false;
            });
            if (schemaVar) {
              const init = ((schemaVar as VariableDeclaration).declarations[0] as VariableDeclarator).init;
              if (init) {
                schemaNode = init;
              }
            }
          } else if (declaration.type === 'ObjectExpression') {
            // Handle inline default export
            schemaNode = declaration;
          }
        }
      });
    }

    if (!schemaNode || schemaNode.type !== 'ObjectExpression') {
      throw new Error('Schema export must be an object');
    }

    // Convert AST to plain object
    const schema = convertAstToObject(schemaNode);
    
    // Validate schema structure
    if (!schema.project_id || typeof schema.project_id !== 'string') {
      throw new Error('Schema must have a project_id string field');
    }
    if (typeof schema.version !== 'number') {
      throw new Error('Schema must have a version number field');
    }
    if (!schema.tables || typeof schema.tables !== 'object') {
      throw new Error('Schema must have a tables object field');
    }

    return schema;
  } catch (error) {
    throw new Error(`Error parsing schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert AST node to plain object
 */
function convertAstToObject(node: Node): any {
  if (node.type === 'ObjectExpression') {
    const obj: Record<string, any> = {};
    for (const prop of node.properties) {
      if (prop.type === 'ObjectProperty') {
        const key = getPropertyKey(prop);
        obj[key] = convertAstToObject(prop.value);
      }
    }
    return obj;
  }
  
  if (node.type === 'ArrayExpression') {
    return node.elements.map(element => element ? convertAstToObject(element) : null);
  }
  
  if (node.type === 'StringLiteral') {
    return node.value;
  }
  
  if (node.type === 'NumericLiteral') {
    return node.value;
  }
  
  if (node.type === 'BooleanLiteral') {
    return node.value;
  }
  
  if (node.type === 'NullLiteral') {
    return null;
  }
  
  if (node.type === 'Identifier') {
    // Handle special identifiers like true, false, null
    if (node.name === 'true') return true;
    if (node.name === 'false') return false;
    if (node.name === 'null') return null;
    throw new Error(`Unexpected identifier: ${node.name}`);
  }
  
  throw new Error(`Unsupported node type: ${node.type}`);
}

/**
 * Get the key from an object property
 */
function getPropertyKey(prop: ObjectProperty): string {
  if (prop.key.type === 'Identifier') {
    return prop.key.name;
  }
  if (prop.key.type === 'StringLiteral') {
    return prop.key.value;
  }
  throw new Error(`Unsupported property key type: ${prop.key.type}`);
}

/**
 * Save schema to config file
 */
export async function saveSchemaToConfig(
  schema: Schema, 
  targetDir: string = process.cwd()
): Promise<string> {
  // Find existing config file
  const existing = await readSchemaFromConfig(targetDir);
  
  if (existing) {
    // Update existing file
    const content = await fs.readFile(existing.filePath, 'utf8');
    const updatedContent = updateSchemaInCode(content, schema);
    await fs.writeFile(existing.filePath, updatedContent, 'utf8');
    return existing.filePath;
  } else {
    // Create new TypeScript config file
    const filePath = path.join(targetDir, 'basic.config.ts');
    const content = generateConfigContent(schema);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }
}

/**
 * Update schema in existing code
 */
function updateSchemaInCode(content: string, newSchema: Schema): string {
  const schemaStr = JSON.stringify(newSchema, null, 2);
  
  // Try to replace existing schema
  const patterns = [
    /(const\s+schema\s*=\s*)({[^;]+})(;)/g,
    /(export\s+const\s+schema\s*=\s*)({[^;]+})(;)/g,
    /(schema\s*=\s*)({[^;]+})(;)/g,
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return content.replace(pattern, `$1${schemaStr}$3`);
    }
  }
  
  throw new Error('Could not update schema in config file');
}

/**
 * Generate new config file content
 */
function generateConfigContent(schema: Schema): string {
  return `// Basic Project Configuration
// see the docs for more info: https://docs.basic.tech

const schema = ${JSON.stringify(schema, null, 2)};

export default schema;
`;
}

/**
 * Check if schema versions are different
 */
export function compareVersions(local: Schema, remote: Schema): {
  status: 'current' | 'ahead' | 'behind' | 'equal';
  localVersion: number;
  remoteVersion: number;
} {
  const localVersion = local.version || 0;
  const remoteVersion = remote.version || 0;
  
  let status: 'current' | 'ahead' | 'behind' | 'equal';
  
  if (localVersion === remoteVersion) {
    status = 'equal';
  } else if (localVersion > remoteVersion) {
    status = 'ahead';
  } else {
    status = 'behind';
  }
  
  return {
    status,
    localVersion,
    remoteVersion
  };
}

export async function parseSchemaFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf8');
  const ast = parse(content, {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  // Extract schema from AST
  // ... existing code ...
} 