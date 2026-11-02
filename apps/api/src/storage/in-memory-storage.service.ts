import {
  GetOptions,
  StorageNotImplementedError,
  StorageObjectNotFoundError,
  StorageService,
  StoredObject,
} from './storage.service.ts';
import { Readable } from 'node:stream';
import { assertValidKey, assertValidTtl } from './storage.validation.ts';
import { buffer } from 'node:stream/consumers';

export class InMemoryStorageService implements StorageService {
  private readonly objects = new Map<
    string,
    { data: Buffer; contentType: string }
  >();

  async put(
    key: string,
    data: Buffer | Readable,
    contentType: string,
  ): Promise<void> {
    assertValidKey(key);

    const bytes = Buffer.isBuffer(data)
      ? Buffer.from(data)
      : await buffer(data);

    this.objects.set(key, { data: bytes, contentType });
  }

  async get(key: string, options?: GetOptions): Promise<StoredObject> {
    assertValidKey(key);

    if (options?.range) {
      throw new StorageNotImplementedError('Range reads are not supported yet');
    }

    const object = this.objects.get(key);

    if (!object) {
      throw new StorageObjectNotFoundError(key);
    }

    return {
      body: Readable.from([Buffer.from(object.data)]),
      contentType: object.contentType,
      size: object.data.length,
    };
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);

    this.objects.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    assertValidKey(key);

    return this.objects.has(key);
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    assertValidKey(key);
    assertValidTtl(ttlSeconds);

    const expires = Date.now() + ttlSeconds * 1000;

    return `memory:///${encodeURIComponent(key)}?expires=${expires}`;
  }
}
