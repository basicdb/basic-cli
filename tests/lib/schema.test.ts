import { describe, it, expect } from 'vitest';
import { extractSchemaFromCode } from '../../src/lib/schema';
import type { Schema } from '../../src/lib/types';

describe('Schema Parser', () => {
  const validSchema: Schema = {
    project_id: 'test-project-id',
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

  describe('Supported Export Patterns', () => {
    it('should parse schema with export const schema = ...', () => {
      const content = `
        export const schema = ${JSON.stringify(validSchema, null, 2)};
      `;
      const result = extractSchemaFromCode(content);
      expect(result).toEqual(validSchema);
    });

    it('should parse schema with export default schema', () => {
      const content = `
        const schema = ${JSON.stringify(validSchema, null, 2)};
        export default schema;
      `;
      const result = extractSchemaFromCode(content);
      expect(result).toEqual(validSchema);
    });

    it('should parse schema with inline export default', () => {
      const content = `
        export default ${JSON.stringify(validSchema, null, 2)};
      `;
      const result = extractSchemaFromCode(content);
      expect(result).toEqual(validSchema);
    });
  });

  describe('Error Cases', () => {
    it('should throw error when no export is found', () => {
      const content = `
        const schema = ${JSON.stringify(validSchema, null, 2)};
      `;
      expect(() => extractSchemaFromCode(content)).toThrow('Schema export must be an object');
    });

    it('should throw error when schema is not an object', () => {
      const content = `
        export default "not an object";
      `;
      expect(() => extractSchemaFromCode(content)).toThrow('Schema export must be an object');
    });

    it('should throw error when schema is missing required fields', () => {
      const invalidSchema = {
        version: 1,
        tables: {}
      };
      const content = `
        export default ${JSON.stringify(invalidSchema, null, 2)};
      `;
      expect(() => extractSchemaFromCode(content)).toThrow('Schema must have a project_id string field');
    });

    it('should throw error when schema has invalid version type', () => {
      const invalidSchema = {
        project_id: 'test-project-id',
        version: '1', // string instead of number
        tables: {}
      };
      const content = `
        export default ${JSON.stringify(invalidSchema, null, 2)};
      `;
      expect(() => extractSchemaFromCode(content)).toThrow('Schema must have a version number field');
    });

    it('should throw error when schema has invalid tables type', () => {
      const invalidSchema = {
        project_id: 'test-project-id',
        version: 1,
        tables: 'not an object'
      };
      const content = `
        export default ${JSON.stringify(invalidSchema, null, 2)};
      `;
      expect(() => extractSchemaFromCode(content)).toThrow('Schema must have a tables object field');
    });
  });

  describe('Complex Schema Cases', () => {
    it('should parse schema with multiple tables', () => {
      const complexSchema: Schema = {
        project_id: 'test-project-id',
        version: 1,
        tables: {
          users: {
            type: 'collection',
            fields: {
              name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' }
            }
          },
          posts: {
            type: 'collection',
            fields: {
              title: { type: 'string' },
              content: { type: 'string' },
              published: { type: 'boolean' }
            }
          }
        }
      };
      const content = `
        export default ${JSON.stringify(complexSchema, null, 2)};
      `;
      const result = extractSchemaFromCode(content);
      expect(result).toEqual(complexSchema);
    });

    it('should parse schema with comments and whitespace', () => {
      const content = `
        // Basic Project Configuration
        // see the docs for more info: https://docs.basic.tech

        export default ${JSON.stringify(validSchema, null, 2)};
      `;
      const result = extractSchemaFromCode(content);
      expect(result).toEqual(validSchema);
    });
  });
}); 