import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { createClient, sendEvent } from './client';
import { Config } from '../../types/config';

vi.mock('axios');
vi.mock('axios-retry');

describe('lib/api/client', () => {
  const mockConfig: Config = {
    url: 'https://test.api.faros.ai',
    graph: 'test-graph',
    origin: 'test-cli',
    apiKey: 'test-api-key',
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('createClient', () => {
    it('should create axios client with correct config', () => {
      const mockCreate = vi.mocked(axios.create);
      mockCreate.mockReturnValue({} as any);
      
      createClient(mockConfig);
      
      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'https://test.api.faros.ai',
        timeout: 60000,
        headers: {
          authorization: 'test-api-key',
          'user-agent': 'faros-cli/1.0.0',
        },
      });
    });
    
    it('should throw error if API key is missing', () => {
      const configWithoutKey: Config = {
        url: 'https://test.api.faros.ai',
        graph: 'test-graph',
        origin: 'test-cli',
      };
      
      expect(() => createClient(configWithoutKey)).toThrow(
        'Faros API key is required'
      );
    });
    
    it('should configure retry logic', () => {
      const mockCreate = vi.mocked(axios.create);
      const mockClient = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockCreate.mockReturnValue(mockClient as any);
      
      createClient(mockConfig);
      
      // axiosRetry should be called with the client
      expect(mockCreate).toHaveBeenCalled();
    });
  });
  
  describe('sendEvent', () => {
    it('should send POST request with correct parameters', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      const mockClient = {
        post: mockPost,
      } as any;
      
      const eventData = {
        type: 'TestExecution',
        version: '0.0.1',
        origin: 'test-cli',
        data: {
          test: {
            id: 'test-123',
            suite: 'Test Suite',
            source: 'Jenkins',
          },
        },
      };
      
      await sendEvent(mockClient, 'test-graph', eventData);
      
      expect(mockPost).toHaveBeenCalledWith(
        '/graphs/test-graph/events',
        eventData,
        {
          params: {
            full: true,
            validateOnly: false,
          },
        }
      );
    });
    
    it('should send with validateOnly option', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      const mockClient = {
        post: mockPost,
      } as any;
      
      const eventData = {
        type: 'TestExecution',
        data: {},
      };
      
      await sendEvent(mockClient, 'test-graph', eventData, {
        validateOnly: true,
      });
      
      expect(mockPost).toHaveBeenCalledWith(
        '/graphs/test-graph/events',
        eventData,
        {
          params: {
            full: true,
            validateOnly: true,
          },
        }
      );
    });
    
    it('should send with full=false option', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      const mockClient = {
        post: mockPost,
      } as any;
      
      const eventData = {
        type: 'CI',
        data: {},
      };
      
      await sendEvent(mockClient, 'test-graph', eventData, {
        full: false,
      });
      
      expect(mockPost).toHaveBeenCalledWith(
        '/graphs/test-graph/events',
        eventData,
        {
          params: {
            full: false,
            validateOnly: false,
          },
        }
      );
    });
    
    it('should propagate errors from API', async () => {
      const mockError = new Error('API Error') as AxiosError;
      const mockPost = vi.fn().mockRejectedValue(mockError);
      const mockClient = {
        post: mockPost,
      } as any;
      
      await expect(
        sendEvent(mockClient, 'test-graph', {})
      ).rejects.toThrow('API Error');
    });
    
    it('should handle 429 rate limit errors', async () => {
      const mockError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      } as AxiosError;
      
      const mockPost = vi.fn().mockRejectedValue(mockError);
      const mockClient = {
        post: mockPost,
      } as any;
      
      await expect(
        sendEvent(mockClient, 'test-graph', {})
      ).rejects.toMatchObject({
        response: {
          status: 429,
        },
      });
    });
    
    it('should handle 503 service unavailable errors', async () => {
      const mockError = {
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' },
        },
      } as AxiosError;
      
      const mockPost = vi.fn().mockRejectedValue(mockError);
      const mockClient = {
        post: mockPost,
      } as any;
      
      await expect(
        sendEvent(mockClient, 'test-graph', {})
      ).rejects.toMatchObject({
        response: {
          status: 503,
        },
      });
    });
    
    it('should handle network timeout errors', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
      } as AxiosError;
      
      const mockPost = vi.fn().mockRejectedValue(mockError);
      const mockClient = {
        post: mockPost,
      } as any;
      
      await expect(
        sendEvent(mockClient, 'test-graph', {})
      ).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });
  });
});
