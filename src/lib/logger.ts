import pino from 'pino';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'faros.log');

let _logger: pino.Logger | null = null;

/** Initialise the file logger. Call once at startup. */
export function initLogger(level: string = 'info'): pino.Logger {
  _logger = pino(
    {
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          'apiKey', 'api_key', 'token', 'secret',
          'password', 'authorization',
          '*.apiKey', '*.api_key', '*.token', '*.secret',
          '*.password', '*.authorization',
          'config.api_key', 'dstConfig.edition_configs.api_key',
        ],
        censor: '***',
      },
    },
    pino.destination({ dest: LOG_FILE, append: true, sync: true }),
  );
  return _logger;
}

/** Get the logger. Returns a silent logger if initLogger hasn't been called. */
export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = pino({ level: 'silent' });
  }
  return _logger;
}

/** Path to the log file. */
export const LOG_FILE_PATH = LOG_FILE;
