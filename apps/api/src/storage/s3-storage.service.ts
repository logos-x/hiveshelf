import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  GetOptions,
  StorageNotImplementedError,
  StorageObjectNotFoundError,
  StorageService,
  StoredObject,
} from './storage.service.ts';
import type { OnModuleDestroy } from '@nestjs/common';
import { Readable } from 'node:stream';
import { assertValidKey, assertValidTtl } from './storage.validation.ts';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

function isMissingObject(error: unknown): boolean {
  return (
    error instanceof S3ServiceException &&
    (error.name === 'NoSuchKey' || error.name === 'NotFound')
  );
}

export class S3StorageService implements StorageService, OnModuleDestroy {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(
    key: string,
    data: Buffer | Readable,
    contentType: string,
  ): Promise<void> {
    assertValidKey(key);

    await new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      },
      leavePartsOnError: false,
    }).done();
  }

  async get(key: string, options?: GetOptions): Promise<StoredObject> {
    assertValidKey(key);

    if (options?.range) {
      throw new StorageNotImplementedError('Range reads are not supported yet');
    }

    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      if (!(result.Body instanceof Readable)) {
        throw new Error('S3 response body is not a Node.js readable stream');
      }

      return {
        body: result.Body,
        contentType: result.ContentType,
        size: result.ContentLength,
      };
    } catch (error: unknown) {
      if (isMissingObject(error)) {
        throw new StorageObjectNotFoundError(key);
      }

      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    assertValidKey(key);

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      return true;
    } catch (error: unknown) {
      if (isMissingObject(error)) {
        return false;
      }

      throw error;
    }
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    assertValidKey(key);
    assertValidTtl(ttlSeconds);

    return presign(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
      { expiresIn: ttlSeconds },
    );
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}
