import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplicationContext } from '@nestjs/common';
import { STORAGE_SERVICE, StorageService } from './storage.service.ts';
import { NestFactory } from '@nestjs/core';
import { StorageModule } from './storage.module.ts';
import { S3StorageService } from './s3-storage.service.ts';
import { storageContract } from '../testing/storage.contract.ts';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

describe('S3 storage integration', () => {
  let app: INestApplicationContext | undefined;
  let storage: StorageService;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(StorageModule, {
      logger: false,
      abortOnError: false,
    });

    storage = app.get<StorageService>(STORAGE_SERVICE);

    if (!(storage instanceof S3StorageService)) {
      throw new Error('Integration tests require STORAGE_DRIVER=s3');
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  storageContract('s3', () => storage);

  it('serves a signed URL and rejects it after expiration:', async () => {
    const key = `test/${randomUUID()}/signed-url.txt`;
    const content = 'Hello from a signed URL';

    try {
      await storage.put(key, Buffer.from(content), 'text/plain');

      const url = await storage.getSignedUrl(key, 5);

      const validResponse = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      expect(validResponse.status).toBe(200);
      expect(await validResponse.text()).toBe(content);

      await delay(6000);

      const expiredResponse = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      await expiredResponse.text();

      expect(expiredResponse.status).toBe(403);
    } finally {
      await storage.delete(key);
    }
  });
});
