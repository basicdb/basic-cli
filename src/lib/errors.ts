export class BasicCliError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'BasicCliError';
  }
}

export class AuthError extends BasicCliError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'AUTH_ERROR', suggestions);
    this.name = 'AuthError';
  }
}

export class ApiError extends BasicCliError {
  constructor(
    message: string,
    public statusCode?: number,
    suggestions?: string[]
  ) {
    super(message, 'API_ERROR', suggestions);
    this.name = 'ApiError';
  }
}

export class SchemaError extends BasicCliError {
  constructor(message: string, suggestions?: string[]) {
    super(message, 'SCHEMA_ERROR', suggestions);
    this.name = 'SchemaError';
  }
}

export class NetworkError extends BasicCliError {
  constructor(message: string = 'Network connection failed') {
    super(message, 'NETWORK_ERROR', [
      'Check your internet connection',
      'Try again in a moment'
    ]);
    this.name = 'NetworkError';
  }
}

export function handleError(error: unknown): BasicCliError {
  if (error instanceof BasicCliError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Handle specific error patterns from the original Go code
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      return new NetworkError();
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return new AuthError('Authentication failed', [
        'Try logging in again with \'basic login\'',
        'Check if your token has expired'
      ]);
    }
    
    if (error.message.includes('invalid character')) {
      return new SchemaError('Invalid schema format', [
        'Check for trailing commas in your schema',
        'Ensure valid JSON syntax'
      ]);
    }
    
    return new BasicCliError(error.message, 'UNKNOWN_ERROR');
  }
  
  return new BasicCliError('An unknown error occurred', 'UNKNOWN_ERROR');
}

export function formatError(error: BasicCliError): string {
  let output = `Error: ${error.message}`;
  
  if (error.suggestions && error.suggestions.length > 0) {
    output += '\n\nSuggestions:';
    error.suggestions.forEach(suggestion => {
      output += `\n  - ${suggestion}`;
    });
  }
  
  return output;
} 