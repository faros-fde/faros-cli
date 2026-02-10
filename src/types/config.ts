import { z } from 'zod';

// Config schema
// NOTE: Sensitive credentials should be in .env, not config files
export const ConfigSchema = z.object({
  // API Configuration (can be in config file)
  url: z.string().url().default('https://prod.api.faros.ai'),
  graph: z.string().default('default'),
  stagingGraph: z.string().optional(),
  origin: z.string().default('faros-cli'),
  
  // Credentials (prefer .env over config file)
  apiKey: z.string().optional(), // Prefer FAROS_API_KEY env var
  
  // Data Sources (credentials should be in .env)
  sources: z.record(z.object({
    type: z.string().optional(),
    apiKey: z.string().optional(), // Prefer SOURCE_API_KEY env var
    token: z.string().optional(), // Prefer SOURCE_TOKEN env var
    bucket: z.string().optional(), // S3 bucket name
    region: z.string().optional(), // S3 region
    prefix: z.string().optional(), // S3 prefix
    pattern: z.string().optional(), // S3 pattern
    syncInterval: z.string().optional(),
    streams: z.array(z.string()).optional(),
  })).optional(),
  
  // Defaults
  defaults: z.object({
    testSource: z.string().optional(),
    testType: z.string().optional(),
    concurrency: z.number().default(8),
  }).optional(),
  
  // Logging
  logs: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    directory: z.string().optional(),
    retention: z.string().optional(),
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
  dryRun?: boolean;
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
  s3Region?: string;
  s3Profile?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  pattern?: string;
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
