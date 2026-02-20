import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeConfig, loadConfig, LoadConfigResult } from './loader';
import { Config } from '../types/config';
import { mockConsole, createMockEnv } from '../test-utils/test-helpers';

describe('config/loader', () => {
  mockConsole();
  
  describe('loadConfig', () => {
    it('should load user config when present', async () => {
      const result = await loadConfig();
      expect(result).toBeDefined();
      expect(result?.config).toBeDefined();
      expect(result?.isDefault).toBeDefined();
    });
    
    it('should indicate when using default config', async () => {
      const result = await loadConfig();
      if (result) {
        expect(typeof result.isDefault).toBe('boolean');
      }
    });
    
    it('should return valid Config object', async () => {
      const result = await loadConfig();
      if (result) {
        expect(result.config.url).toBeDefined();
        expect(result.config.graph).toBeDefined();
        expect(result.config.origin).toBeDefined();
      }
    });
  });
  
  describe('mergeConfig', () => {
    const defaultFileConfig: Config = {
      url: 'https://file.api.faros.ai',
      graph: 'file-graph',
      origin: 'file-origin',
      defaults: {
        concurrency: 4,
        testSource: 'FileSource',
      },
    };
    
    const wrapConfig = (config: Config, isDefault = false): LoadConfigResult => ({
      config,
      isDefault,
    });
    
    it('should throw error when no config file provided', () => {
      expect(() => mergeConfig(null, {}, {})).toThrow(
        'Configuration file not found. Please create a faros.config.yaml file.'
      );
    });
    
    it('should merge file config with defaults', () => {
      const result = mergeConfig(wrapConfig(defaultFileConfig), {}, {});
      
      expect(result.url).toBe('https://file.api.faros.ai');
      expect(result.graph).toBe('file-graph');
      expect(result.origin).toBe('file-origin');
      expect(result.defaults?.concurrency).toBe(4);
      expect(result.defaults?.testSource).toBe('FileSource');
    });
    
    it('should prioritize env vars over file config', () => {
      const envVars = createMockEnv({
        FAROS_URL: 'https://env.api.faros.ai',
        FAROS_GRAPH: 'env-graph',
        FAROS_ORIGIN: 'env-origin',
      });
      
      const result = mergeConfig(wrapConfig(defaultFileConfig), {}, envVars);
      
      expect(result.url).toBe('https://env.api.faros.ai');
      expect(result.graph).toBe('env-graph');
      expect(result.origin).toBe('env-origin');
    });
    
    it('should prioritize CLI options over env vars and file config', () => {
      const envVars = createMockEnv({
        FAROS_URL: 'https://env.api.faros.ai',
        FAROS_GRAPH: 'env-graph',
      });
      
      const cliOptions = {
        url: 'https://cli.api.faros.ai',
        graph: 'cli-graph',
      };
      
      const result = mergeConfig(wrapConfig(defaultFileConfig), cliOptions, envVars);
      
      expect(result.url).toBe('https://cli.api.faros.ai');
      expect(result.graph).toBe('cli-graph');
    });
    
    it('should set API key from env var', () => {
      const envVars = createMockEnv({
        FAROS_API_KEY: 'test-api-key',
      });
      
      const minimalConfig: Config = {
        url: 'https://prod.api.faros.ai',
        graph: 'default',
        origin: 'faros-cli',
      };
      
      const result = mergeConfig(wrapConfig(minimalConfig), {}, envVars);
      
      expect(result.apiKey).toBe('test-api-key');
    });
    
    it('should prioritize CLI API key over env var', () => {
      const envVars = createMockEnv({
        FAROS_API_KEY: 'env-api-key',
      });
      
      const cliOptions = {
        apiKey: 'cli-api-key',
      };
      
      const minimalConfig: Config = {
        url: 'https://prod.api.faros.ai',
        graph: 'default',
        origin: 'faros-cli',
      };
      
      const result = mergeConfig(wrapConfig(minimalConfig), cliOptions, envVars);
      
      expect(result.apiKey).toBe('cli-api-key');
    });
    
    it('should strip API key from file config for security', () => {
      const unsafeFileConfig: Config = {
        url: 'https://file.api.faros.ai',
        graph: 'file-graph',
        origin: 'file-origin',
        apiKey: 'should-be-removed',
      };
      
      const result = mergeConfig(wrapConfig(unsafeFileConfig), {}, {});
      
      expect(result.apiKey).toBeUndefined();
    });
    
    it('should strip credentials from sources in file config', () => {
      const unsafeFileConfig: Config = {
        url: 'https://file.api.faros.ai',
        graph: 'file-graph',
        origin: 'file-origin',
        sources: {
          github: {
            type: 'GitHub',
            apiKey: 'should-be-removed',
            token: 'should-also-be-removed',
          } as any,
        },
      };
      
      const result = mergeConfig(wrapConfig(unsafeFileConfig), {}, {});
      
      expect(result.sources?.github).toBeDefined();
      expect((result.sources?.github as any)?.apiKey).toBeUndefined();
      expect((result.sources?.github as any)?.token).toBeUndefined();
    });
    
    it('should initialize sources from env vars', () => {
      const envVars = createMockEnv({
        LINEAR_API_KEY: 'linear-key',
        GITHUB_TOKEN: 'github-token',
      });
      
      const minimalConfig: Config = {
        url: 'https://prod.api.faros.ai',
        graph: 'default',
        origin: 'faros-cli',
      };
      
      const result = mergeConfig(wrapConfig(minimalConfig), {}, envVars);
      
      expect(result.sources?.linear).toBeDefined();
      expect(result.sources?.linear?.type).toBe('Linear');
      expect(result.sources?.github).toBeDefined();
      expect(result.sources?.github?.type).toBe('GitHub');
    });
    
    it('should preserve existing sources config when adding from env', () => {
      const fileConfig: Config = {
        url: 'https://file.api.faros.ai',
        graph: 'file-graph',
        origin: 'file-origin',
        sources: {
          linear: {
            type: 'Linear',
            cutoffDays: 30,
          },
        },
      };
      
      const envVars = createMockEnv({
        LINEAR_API_KEY: 'linear-key',
      });
      
      const result = mergeConfig(wrapConfig(fileConfig), {}, envVars);
      
      expect(result.sources?.linear?.type).toBe('Linear');
      expect(result.sources?.linear?.cutoffDays).toBe(30);
    });
    
    it('should handle complete priority chain: CLI > env > file > defaults', () => {
      const fileConfig: Config = {
        url: 'https://file.api.faros.ai',
        graph: 'file-graph',
        origin: 'file-origin',
        defaults: {
          concurrency: 4,
        },
      };
      
      const envVars = createMockEnv({
        FAROS_URL: 'https://env.api.faros.ai',
      });
      
      const cliOptions = {
        graph: 'cli-graph',
      };
      
      const result = mergeConfig(wrapConfig(fileConfig), cliOptions, envVars);
      
      // CLI wins for graph
      expect(result.graph).toBe('cli-graph');
      // Env wins for url (file config overridden)
      expect(result.url).toBe('https://env.api.faros.ai');
      // File config wins for origin (no CLI or env override)
      expect(result.origin).toBe('file-origin');
      // File config wins for defaults
      expect(result.defaults?.concurrency).toBe(4);
    });
  });
});
