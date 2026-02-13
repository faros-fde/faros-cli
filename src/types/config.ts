import { z } from 'zod';

// Config schema
// NOTE: All credentials (API keys, tokens) MUST be in .env or env vars, NOT in config files.
export const ConfigSchema = z.object({
  // API Configuration (can be in config file)
  url: z.string().url().default('https://prod.api.faros.ai'),
  graph: z.string().default('default'),
  origin: z.string().default('faros-cli'),
  
  // Credentials - populated at runtime from env vars / CLI flags only.
  // Not read from config file. Set FAROS_API_KEY in .env or environment.
  apiKey: z.string().optional(),
  
  // Data Sources
  // Credentials (apiKey, token) are injected at runtime from env vars / .env only.
  sources: z.record(z.object({
    type: z.string().optional(),
    bucket: z.string().optional(), // S3 bucket name
    region: z.string().optional(), // S3 region
    prefix: z.string().optional(), // S3 prefix
    pattern: z.string().optional(), // S3 pattern
    syncInterval: z.string().optional(),
    streams: z.array(z.string()).optional(),
    // Linear-specific settings
    cutoffDays: z.number().optional(),
    pageSize: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    // Docker image overrides
    srcImage: z.string().optional(),
    dstImage: z.string().optional(),
    // Connection settings
    connectionName: z.string().optional(),
  })).optional().nullable(),
  
  // Defaults
  defaults: z.object({
    testSource: z.string().optional(),
    testType: z.string().optional(),
    concurrency: z.number().default(8),
  }).optional(),
  
  // Logging
  logs: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// Command options
export interface BaseCommandOptions {
  apiKey?: string;
  url?: string;
  graph?: string;
  debug?: boolean;
  quiet?: boolean;
  json?: boolean;
  noColor?: boolean;
  validate?: boolean;
  preview?: boolean;
}

export interface SyncTestsOptions extends BaseCommandOptions {
  format?: string;
  source?: string;
  type?: string;
  commit?: string;
  testStart?: string;
  testEnd?: string;
  concurrency?: number;
}

export interface SyncCICDOptions extends BaseCommandOptions {
  status?: string;
  commit?: string;
  run?: string;
  runStatus?: string;
  runStartTime?: string;
  runEndTime?: string;
  deploy?: string;
  deployStatus?: string;
  deployStartTime?: string;
  deployEndTime?: string;
  artifact?: string;
}

export interface SyncLinearOptions extends BaseCommandOptions {
  linearApiKey?: string;
  cutoffDays?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  streams?: string;
  fullRefresh?: boolean;
  connectionName?: string;
  checkConnection?: boolean;
  stateFile?: string;
  srcImage?: string;
  dstImage?: string;
  keepContainers?: boolean;
  logLevel?: string;
  rawMessages?: boolean;
  noSrcPull?: boolean;
  noDstPull?: boolean;
}
