import { cosmiconfig } from 'cosmiconfig';
import { ConfigSchema, Config } from '../types/config';
import dotenv from 'dotenv';
import path from 'path';
import { ui } from '../lib/ui';
import * as fs from 'fs';

// Load .env file if it exists (checks multiple locations)
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const explorer = cosmiconfig('faros', {
  searchPlaces: [
    'faros.config.yaml',
    'faros.config.yml',
    'faros.config.json',
    'faros.config.js',
    'faros.config.cjs',
    '.farosrc.yaml',
    '.farosrc.yml',
    '.farosrc.json',
    '.farosrc.js',
    '.farosrc.cjs',
  ],
});

export async function loadConfig(): Promise<Config | null> {
  try {
    const result = await explorer.search();
    
    if (!result || result.isEmpty) {
      return null;
    }
    
    // Validate config
    const config = ConfigSchema.parse(result.config);
    
    return config;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      ui.log.error('Invalid configuration file:');
      error.errors.forEach((e: any) => {
        console.error(`  ${e.path.join('.')}: ${e.message}`);
      });
      process.exit(1);
    }
    
    // Config file not found or parse error - that's ok
    return null;
  }
}

export function mergeConfig(
  fileConfig: Config | null,
  cliOptions: any,
  envVars: NodeJS.ProcessEnv = process.env
): Config {
  const merged: any = {
    url: 'https://prod.api.faros.ai',
    graph: 'default',
    origin: 'faros-cli',
    defaults: {
      concurrency: 8,
    },
    ...fileConfig,
  };
  
  // Strip any credentials that may have been placed in the config file.
  // Credentials must come from env vars / .env only.
  delete merged.apiKey;
  if (merged.sources) {
    for (const source of Object.values(merged.sources) as any[]) {
      delete source?.apiKey;
      delete source?.token;
    }
  }

  // Credentials from environment variables / .env file only
  if (envVars.FAROS_API_KEY) merged.apiKey = envVars.FAROS_API_KEY;
  if (envVars.LINEAR_API_KEY) {
    if (!merged.sources) merged.sources = {};
    if (!merged.sources.linear) merged.sources.linear = { type: 'Linear' };
  }
  if (envVars.GITHUB_TOKEN) {
    if (!merged.sources) merged.sources = {};
    if (!merged.sources.github) merged.sources.github = { type: 'GitHub' };
  }
  
  // AWS credentials from environment
  if (envVars.AWS_ACCESS_KEY_ID) {
    // AWS SDK will pick these up automatically
  }
  
  // Configuration from environment variables (lower priority)
  if (envVars.FAROS_URL) merged.url = envVars.FAROS_URL;
  if (envVars.FAROS_GRAPH) merged.graph = envVars.FAROS_GRAPH;
  if (envVars.FAROS_ORIGIN) merged.origin = envVars.FAROS_ORIGIN;
  
  // CLI options override everything
  if (cliOptions.apiKey) merged.apiKey = cliOptions.apiKey;
  if (cliOptions.url) merged.url = cliOptions.url;
  if (cliOptions.graph) merged.graph = cliOptions.graph;
  
  return merged;
}

export function getStagingGraph(config: Config): string {
  return config.stagingGraph || `${config.graph}-staging`;
}
