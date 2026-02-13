import { vi } from 'vitest';

/**
 * Mock console methods to prevent noisy test output
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });
  
  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
}

/**
 * Mock process.exit to prevent tests from exiting
 */
export function mockProcessExit() {
  const originalExit = process.exit;
  
  beforeEach(() => {
    process.exit = vi.fn() as any;
  });
  
  afterEach(() => {
    process.exit = originalExit;
  });
}

/**
 * Create a mock environment with specific variables
 */
export function createMockEnv(vars: Record<string, string>): NodeJS.ProcessEnv {
  return { ...vars };
}

/**
 * Reset all environment variables to a clean state
 */
export function cleanEnv(keys: string[] = []) {
  keys.forEach(key => {
    delete process.env[key];
  });
}
