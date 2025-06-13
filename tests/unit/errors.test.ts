import { describe, it, expect } from 'vitest';
import { 
  BasicCliError, 
  AuthError, 
  ApiError, 
  SchemaError, 
  NetworkError,
  handleError,
  formatError
} from '../../src/lib/errors';

describe('Error handling', () => {
  describe('BasicCliError', () => {
    it('should create error with message and code', () => {
      const error = new BasicCliError('Test error', 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('BasicCliError');
    });

    it('should include suggestions when provided', () => {
      const suggestions = ['Try this', 'Or this'];
      const error = new BasicCliError('Test error', 'TEST_ERROR', suggestions);
      
      expect(error.suggestions).toEqual(suggestions);
    });
  });

  describe('AuthError', () => {
    it('should create auth error with correct code', () => {
      const error = new AuthError('Auth failed');
      
      expect(error.message).toBe('Auth failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.name).toBe('AuthError');
    });
  });

  describe('ApiError', () => {
    it('should create API error with status code', () => {
      const error = new ApiError('API failed', 404);
      
      expect(error.message).toBe('API failed');
      expect(error.code).toBe('API_ERROR');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
    });
  });

  describe('SchemaError', () => {
    it('should create schema error with suggestions', () => {
      const suggestions = ['Check syntax', 'Remove trailing commas'];
      const error = new SchemaError('Invalid schema', suggestions);
      
      expect(error.message).toBe('Invalid schema');
      expect(error.code).toBe('SCHEMA_ERROR');
      expect(error.suggestions).toEqual(suggestions);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with default message', () => {
      const error = new NetworkError();
      
      expect(error.message).toBe('Network connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.suggestions).toContain('Check your internet connection');
    });

    it('should accept custom message', () => {
      const error = new NetworkError('Custom network error');
      
      expect(error.message).toBe('Custom network error');
    });
  });

  describe('handleError', () => {
    it('should return BasicCliError as-is', () => {
      const originalError = new BasicCliError('Test', 'TEST');
      const result = handleError(originalError);
      
      expect(result).toBe(originalError);
    });

    it('should convert network errors', () => {
      const networkError = new Error('ENOTFOUND api.basic.tech');
      const result = handleError(networkError);
      
      expect(result).toBeInstanceOf(NetworkError);
    });

    it('should convert auth errors', () => {
      const authError = new Error('unauthorized access');
      const result = handleError(authError);
      
      expect(result).toBeInstanceOf(AuthError);
      expect(result.message).toBe('Authentication failed');
    });

    it('should convert schema errors', () => {
      const schemaError = new Error('invalid character \'}\'');
      const result = handleError(schemaError);
      
      expect(result).toBeInstanceOf(SchemaError);
      expect(result.suggestions).toContain('Check for trailing commas in your schema');
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      const result = handleError(unknownError);
      
      expect(result).toBeInstanceOf(BasicCliError);
      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle non-Error objects', () => {
      const result = handleError('string error');
      
      expect(result).toBeInstanceOf(BasicCliError);
      expect(result.message).toBe('An unknown error occurred');
    });
  });

  describe('formatError', () => {
    it('should format error without suggestions', () => {
      const error = new BasicCliError('Test error', 'TEST');
      const formatted = formatError(error);
      
      expect(formatted).toBe('Error: Test error');
    });

    it('should format error with suggestions', () => {
      const error = new BasicCliError('Test error', 'TEST', ['Try this', 'Or that']);
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error: Test error');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('  - Try this');
      expect(formatted).toContain('  - Or that');
    });
  });
}); 