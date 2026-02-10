import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface S3Config {
  readonly region?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly endpoint?: string;
  readonly profile?: string;
}

export function createS3Client(config: S3Config): S3Client {
  const s3Config: S3ClientConfig = {};
  
  if (config.region) {
    s3Config.region = config.region;
  }
  
  if (config.accessKeyId && config.secretAccessKey) {
    s3Config.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }
  
  if (config.endpoint) {
    s3Config.endpoint = config.endpoint;
  }
  
  if (config.profile) {
    process.env.AWS_PROFILE = config.profile;
  }
  
  return new S3Client(s3Config);
}

export interface S3Uri {
  bucket: string;
  key: string;
}

export function parseS3Uri(uri: string): S3Uri {
  const match = uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(
      `Invalid S3 URI format: ${uri}. Expected format: s3://bucket/key`
    );
  }
  return {
    bucket: match[1],
    key: match[2],
  };
}

export async function listS3Objects(
  client: S3Client,
  bucket: string,
  prefix: string,
  pattern?: string
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    
    const response = await client.send(command);
    
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          if (!pattern || new RegExp(pattern).test(obj.Key)) {
            keys.push(obj.Key);
          }
        }
      }
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  return keys;
}

export async function downloadS3Object(
  client: S3Client,
  bucket: string,
  key: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  const response = await client.send(command);
  
  if (!response.Body) {
    throw new Error(`No content in S3 object: s3://${bucket}/${key}`);
  }
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faros-s3-'));
  const tempFile = path.join(tempDir, path.basename(key));
  
  const body = response.Body as Readable;
  const fileStream = fs.createWriteStream(tempFile);
  
  await new Promise<void>((resolve, reject) => {
    body.pipe(fileStream);
    body.on('error', reject);
    fileStream.on('finish', () => resolve());
    fileStream.on('error', reject);
  });
  
  return tempFile;
}

export async function downloadS3Objects(
  client: S3Client,
  bucket: string,
  keys: string[]
): Promise<string[]> {
  const tempFiles: string[] = [];
  
  for (const key of keys) {
    const tempFile = await downloadS3Object(client, bucket, key);
    tempFiles.push(tempFile);
  }
  
  return tempFiles;
}

export function cleanupTempFiles(files: string[]): void {
  for (const file of files) {
    try {
      const dir = path.dirname(file);
      fs.unlinkSync(file);
      fs.rmdirSync(dir);
    } catch {
      // Ignore errors
    }
  }
}
