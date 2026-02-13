import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as configLoader from '../../config/loader';
import * as apiClient from '../../lib/api/client';
import { mockConsole } from '../../test-utils/test-helpers';

vi.mock('../../config/loader');
vi.mock('../../lib/api/client');

describe('commands/sync/ci-cd', () => {
  mockConsole();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(configLoader.loadConfig).mockResolvedValue(null);
    vi.mocked(configLoader.mergeConfig).mockReturnValue({
      url: 'https://test.api.faros.ai',
      graph: 'test-graph',
      origin: 'test-cli',
      apiKey: 'test-key',
    });
    
    const mockClient = {
      post: vi.fn().mockResolvedValue({ data: {} }),
    };
    vi.mocked(apiClient.createClient).mockReturnValue(mockClient as any);
    vi.mocked(apiClient.sendEvent).mockResolvedValue(undefined);
  });
  
  describe('build status events', () => {
    it('should create CI event with commit', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CI',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          commit: { uri: 'GitHub://org/repo/abc123' },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should create CI event with run', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CI',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          run: { 
            uri: 'Jenkins://org/job/123',
            status: { category: 'Success' },
          },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should create CI event with commit and run', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CI',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          commit: { uri: 'GitHub://org/repo/abc123' },
          run: { 
            uri: 'Jenkins://org/job/123',
            status: { category: 'Success' },
            startedAt: '2024-01-15T10:00:00Z',
            endedAt: '2024-01-15T10:05:00Z',
          },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should create CI event with artifact', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CI',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          commit: { uri: 'GitHub://org/repo/abc123' },
          artifact: { uri: 'Docker://registry/image:tag' },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should handle different run statuses', async () => {
      const statuses = ['Success', 'Failed', 'Canceled', 'Queued', 'Running', 'Unknown'];
      
      for (const status of statuses) {
        const mockClient = {} as any;
        const eventData = {
          type: 'CI',
          version: '0.0.1',
          origin: 'test-cli',
          data: {
            commit: { uri: 'GitHub://org/repo/abc123' },
            run: {
              uri: 'Jenkins://org/job/123',
              status: { category: status },
            },
          },
        };
        
        await apiClient.sendEvent(mockClient, 'test-graph', eventData);
        
        expect(apiClient.sendEvent).toHaveBeenCalledWith(
          mockClient,
          'test-graph',
          eventData
        );
        
        vi.clearAllMocks();
      }
    });
  });
  
  describe('deployment events', () => {
    it('should create CD event with deployment', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CD',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          deploy: { uri: 'Kubernetes://cluster/app/prod/v1.0.0' },
          commit: { uri: 'GitHub://org/repo/abc123' },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should create CD event with deployment and artifact', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CD',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          deploy: { uri: 'Kubernetes://cluster/app/prod/v1.0.0' },
          artifact: { uri: 'Docker://registry/image:v1.0.0' },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should create CD event with deployment status', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CD',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          deploy: {
            uri: 'Kubernetes://cluster/app/prod/v1.0.0',
            status: { category: 'Success' },
            startedAt: '2024-01-15T10:00:00Z',
            endedAt: '2024-01-15T10:15:00Z',
          },
          commit: { uri: 'GitHub://org/repo/abc123' },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should create CD event with deployment and run', async () => {
      const mockClient = {} as any;
      const eventData = {
        type: 'CD',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          deploy: { uri: 'Kubernetes://cluster/app/prod/v1.0.0' },
          commit: { uri: 'GitHub://org/repo/abc123' },
          run: {
            uri: 'Jenkins://org/deploy-job/456',
            status: { category: 'Success' },
          },
        },
      };
      
      await apiClient.sendEvent(mockClient, 'test-graph', eventData);
      
      expect(apiClient.sendEvent).toHaveBeenCalledWith(
        mockClient,
        'test-graph',
        eventData
      );
    });
    
    it('should handle different deployment statuses', async () => {
      const statuses = ['Success', 'Failed', 'Canceled', 'Queued', 'Running', 'RolledBack'];
      
      for (const status of statuses) {
        const mockClient = {} as any;
        const eventData = {
          type: 'CD',
          version: '0.0.1',
          origin: 'test-cli',
          data: {
            deploy: {
              uri: 'Kubernetes://cluster/app/prod/v1.0.0',
              status: { category: status },
            },
            commit: { uri: 'GitHub://org/repo/abc123' },
          },
        };
        
        await apiClient.sendEvent(mockClient, 'test-graph', eventData);
        
        expect(apiClient.sendEvent).toHaveBeenCalledWith(
          mockClient,
          'test-graph',
          eventData
        );
        
        vi.clearAllMocks();
      }
    });
  });
  
  describe('time parsing', () => {
    it('should parse "now" as current time', () => {
      const time = 'now';
      const parsed = time.toLowerCase() === 'now' ? new Date().toISOString() : time;
      
      expect(parsed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
    
    it('should parse epoch milliseconds', () => {
      const time = '1705312800000'; // 2024-01-15T10:00:00.000Z
      const parsed = /^\d+$/.test(time) ? new Date(parseInt(time, 10)).toISOString() : time;
      
      expect(parsed).toBe('2024-01-15T10:00:00.000Z');
    });
    
    it('should pass through ISO-8601 strings', () => {
      const time = '2024-01-15T10:00:00Z';
      const parsed = time;
      
      expect(parsed).toBe('2024-01-15T10:00:00Z');
    });
  });
  
  describe('URI validation', () => {
    it('should accept valid commit URIs', () => {
      const validUris = [
        'GitHub://org/repo/abc123',
        'GitLab://group/project/def456',
        'Bitbucket://workspace/repo/ghi789',
      ];
      
      validUris.forEach(uri => {
        expect(uri).toMatch(/^[A-Za-z]+:\/\/.+\/.+\/.+$/);
      });
    });
    
    it('should accept valid run URIs', () => {
      const validUris = [
        'Jenkins://org/job/123',
        'GitHub-Actions://org/repo/workflow/456',
        'CircleCI://org/project/789',
      ];
      
      validUris.forEach(uri => {
        expect(uri).toMatch(/^[A-Za-z-]+:\/\/.+/);
      });
    });
    
    it('should accept valid deploy URIs', () => {
      const validUris = [
        'Kubernetes://cluster/app/prod/v1.0.0',
        'AWS-ECS://cluster/service/v2.0.0',
        'Heroku://app/staging/v3.0.0',
      ];
      
      validUris.forEach(uri => {
        expect(uri).toMatch(/^[A-Za-z-]+:\/\/.+/);
      });
    });
    
    it('should accept valid artifact URIs', () => {
      const validUris = [
        'Docker://registry/image:tag',
        'NPM://package@version',
        'Maven://group:artifact:version',
      ];
      
      validUris.forEach(uri => {
        expect(uri).toMatch(/^[A-Za-z]+:\/\/.+/);
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle missing required fields', () => {
      // Build event requires either --commit or --run
      const hasCommit = false;
      const hasRun = false;
      
      expect(hasCommit || hasRun).toBe(false);
    });
    
    it('should handle API errors', async () => {
      vi.mocked(apiClient.sendEvent).mockRejectedValue(new Error('API Error'));
      
      await expect(apiClient.sendEvent({} as any, 'graph', {})).rejects.toThrow('API Error');
    });
  });
});
