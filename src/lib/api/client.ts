import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { Config } from '../../types/config';

export function createClient(config: Config): AxiosInstance {
  if (!config.apiKey) {
    throw new Error('Faros API key is required. Set via --api-key, FAROS_API_KEY env var, or config file');
  }
  
  const client = axios.create({
    baseURL: config.url,
    timeout: 60000,
    headers: {
      authorization: config.apiKey,
      'user-agent': 'faros-cli/1.0.0',
    },
  });
  
  // Add retry logic
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429 || // Rate limit
        error.response?.status === 503    // Service unavailable
      );
    },
  });
  
  return client;
}

export async function sendEvent(
  client: AxiosInstance,
  graph: string,
  data: any,
  options: {
    validateOnly?: boolean;
    full?: boolean;
  } = {}
): Promise<void> {
  await client.post(`/graphs/${graph}/events`, data, {
    params: {
      full: options.full ?? true,
      validateOnly: options.validateOnly ?? false,
    },
  });
}
