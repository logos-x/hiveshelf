import type { Readable } from 'node:stream';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StoredObject {
  body: Readable;
  contentType?: string;
  size?: number;
}

export interface GetOptions {
  /** Reserved for future audio support; currently rejected by adapters. */
  range?: { start: number; end?: number };
}

export interface StorageService {
  put(key: string, data: Buffer | Readable, contentType: string): Promise<void>;

  /** Throws StorageObjectNotFoundError when the object is missing. */
  get(key: string, options?: GetOptions): Promise<StoredObject>;

  /** Deleting a missing object succeeds. */
  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;

  /** URL lifetime in seconds; integer from 1 to 604800. */
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
}

export class StorageObjectNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Storage object not found: ${key}`);
    this.name = 'StorageObjectNotFoundError';
  }
}

export class StorageNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageNotImplementedError';
  }
}
