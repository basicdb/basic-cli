import { vi } from 'vitest';

// Mock file system operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn()
  },
  readFileSync: vi.fn()
}));

// Mock child_process for browser opening
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock crypto for random generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array | Uint16Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Mock process.platform for cross-platform testing
Object.defineProperty(process, 'platform', {
  value: 'darwin',
  writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
}; 