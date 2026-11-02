import type { Readable } from 'node:stream';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StoredObject {
  body: Readable;
  contentType?: string;
  size?: number;
}

export interface GetOptions {
  range?: { start: number; end?: number };
}

export interface StorageService {
  put(key: string, data: Buffer | Readable, contentType: string): Promise<void>;

  get(key: string, options?: GetOptions): Promise<StoredObject>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;

  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
}

export class StorageObjectNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageObjectNotFoundError';
  }
}

export class StorageNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageNotImplementedError';
  }
}
