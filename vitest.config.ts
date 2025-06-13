import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/index.ts' // CLI entry point
      ]
    },
    // Mock file system operations by default
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
}); 