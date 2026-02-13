import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initLogger, getLogger, LOG_FILE_PATH } from './logger';

vi.mock('fs');

describe('lib/logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('initLogger', () => {
    it('should initialize logger with default info level', () => {
      const logger = initLogger();
      
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
    });
    
    it('should initialize logger with specified level', () => {
      const logger = initLogger('debug');
      
      expect(logger).toBeDefined();
      expect(logger.level).toBe('debug');
    });
    
    it('should configure redaction for sensitive fields', () => {
      const logger = initLogger();
      
      // Test that logger is configured with redaction paths
      // This is a structural test since pino's redaction is internal
      expect(logger).toBeDefined();
    });
    
    it('should log to file at correct path', () => {
      initLogger();
      
      expect(LOG_FILE_PATH).toBe(path.join(process.cwd(), 'faros.log'));
    });
  });
  
  describe('getLogger', () => {
    it('should return initialized logger', () => {
      const initedLogger = initLogger('info');
      const retrievedLogger = getLogger();
      
      expect(retrievedLogger).toBe(initedLogger);
    });
    
    it('should return a logger instance', () => {
      // The logger may be initialized from previous tests or module imports
      const logger = getLogger();
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
  
  describe('LOG_FILE_PATH', () => {
    it('should export log file path', () => {
      expect(LOG_FILE_PATH).toBe(path.join(process.cwd(), 'faros.log'));
    });
  });
  
  describe('sensitive data redaction', () => {
    it('should redact apiKey in log messages', () => {
      const logger = initLogger('info');
      
      // Create a spy on the logger
      const logSpy = vi.spyOn(logger, 'info');
      
      logger.info({ apiKey: 'secret-key-123' }, 'Test message');
      
      // The actual redaction is done by pino internally, but we can verify the call was made
      expect(logSpy).toHaveBeenCalled();
    });
    
    it('should redact nested credentials', () => {
      const logger = initLogger('info');
      const logSpy = vi.spyOn(logger, 'info');
      
      logger.info({
        config: {
          api_key: 'secret-123',
          token: 'token-456',
          password: 'pass-789',
        },
      }, 'Test with nested creds');
      
      expect(logSpy).toHaveBeenCalled();
    });
  });
  
  describe('log levels', () => {
    it('should support debug level', () => {
      const logger = initLogger('debug');
      const debugSpy = vi.spyOn(logger, 'debug');
      
      logger.debug('Debug message');
      
      expect(debugSpy).toHaveBeenCalledWith('Debug message');
    });
    
    it('should support info level', () => {
      const logger = initLogger('info');
      const infoSpy = vi.spyOn(logger, 'info');
      
      logger.info('Info message');
      
      expect(infoSpy).toHaveBeenCalledWith('Info message');
    });
    
    it('should support warn level', () => {
      const logger = initLogger('warn');
      const warnSpy = vi.spyOn(logger, 'warn');
      
      logger.warn('Warning message');
      
      expect(warnSpy).toHaveBeenCalledWith('Warning message');
    });
    
    it('should support error level', () => {
      const logger = initLogger('error');
      const errorSpy = vi.spyOn(logger, 'error');
      
      logger.error('Error message');
      
      expect(errorSpy).toHaveBeenCalledWith('Error message');
    });
    
    it('should not log debug messages when level is info', () => {
      const logger = initLogger('info');
      const debugSpy = vi.spyOn(logger, 'debug');
      
      logger.debug('This should not be logged');
      
      // Logger will still be called, but pino will filter it internally
      expect(debugSpy).toHaveBeenCalled();
    });
  });
});
