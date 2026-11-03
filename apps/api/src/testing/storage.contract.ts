import {
  StorageNotImplementedError,
  StorageObjectNotFoundError,
  StorageService,
} from '../storage/storage.service.ts';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';

export function storageContract(
  name: string,
  make: () => StorageService,
): void {
  describe(`StorageService contract: ${name}`, () => {
    it.each(['buffer', 'stream'] as const)(
      'supports the object lifecycle with a %s',
      async (inputType) => {
        const storage = make();
        const key = `test/${randomUUID()}/hello.txt`;
        const expected = Buffer.from('Xin chào Hiveshelf');
        const input =
          inputType === 'buffer' ? expected : Readable.from([expected]);

        try {
          expect(await storage.exists(key)).toBe(false);

          await storage.put(key, input, 'text/plain');

          expect(await storage.exists(key)).toBe(true);

          const object = await storage.get(key);

          expect(await buffer(object.body)).toEqual(expected);
          expect(object.contentType).toBe('text/plain');
          expect(object.size).toBe(expected.length);

          await storage.delete(key);

          expect(await storage.exists(key)).toBe(false);
          await expect(storage.get(key)).rejects.toBeInstanceOf(
            StorageObjectNotFoundError,
          );
        } finally {
          await storage.delete(key);
        }
      },
    );

    it('allows deleting a missing object', async () => {
      const storage = make();

      await expect(
        storage.delete(`test/${randomUUID()}/missing.txt`),
      ).resolves.toBeUndefined();
    });

    it.each(['', '   ', '/absolute.txt', '../secret', 'a\u0000b'])(
      'rejects invalid key %j in every operation',
      async (key) => {
        const storage = make();

        await expect(
          storage.put(key, Buffer.from('data'), 'text/plain'),
        ).rejects.toThrow('Invalid storage key');
        await expect(storage.get(key)).rejects.toThrow('Invalid storage key');
        await expect(storage.delete(key)).rejects.toThrow(
          'Invalid storage key',
        );
        await expect(storage.exists(key)).rejects.toThrow(
          'Invalid storage key',
        );
        await expect(storage.getSignedUrl(key, 60)).rejects.toThrow(
          'Invalid storage key',
        );
      },
    );

    it('explicitly rejects range reads', async () => {
      const storage = make();

      await expect(
        storage.get('test/audio.mp3', { range: { start: 0 } }),
      ).rejects.toBeInstanceOf(StorageNotImplementedError);
    });

    it.each([0, -1, 1.5, Number.NaN, 604801])(
      'rejects invalid TTL %s',
      async (ttl) => {
        const storage = make();

        await expect(
          storage.getSignedUrl('test/file.txt', ttl),
        ).rejects.toThrow('Storage URL TTL');
      },
    );
  });
}
