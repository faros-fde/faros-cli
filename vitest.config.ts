import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'lib', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'lib/**',
        'dist/**',
        'test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.*',
        '**/types/**',
        'src/index.ts', // CLI entry point
        'src/test-utils/**',
        'src/commands/**', // Command handlers need e2e testing
        'vitest.config.ts',
        'eslint.config.js',
      ],
      // Note: Global thresholds are conservative due to command handlers 
      // requiring e2e testing. Per-file thresholds enforce coverage on critical paths.
      thresholds: {
        lines: 23,
        functions: 30,
        branches: 60,
        statements: 23,
        // Per-file thresholds for critical paths
        'src/config/loader.ts': {
          lines: 70,
          functions: 65,
          branches: 75,
          statements: 70,
        },
        'src/lib/api/client.ts': {
          lines: 85,
          functions: 65,
          branches: 100,
          statements: 85,
        },
        'src/lib/logger.ts': {
          lines: 90,
          functions: 100,
          branches: 60,
          statements: 90,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
