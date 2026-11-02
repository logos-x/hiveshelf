import { describe, it, expect } from 'vitest';
import { assertSafeReset } from './db-reset.guard.js';

describe('database reset guard', () => {
  it.each([
    'postgresql://user:password@localhost:5432/hiveshelf',
    'postgresql://user:password@127.0.0.1:5432/hiveshelf_test',
    'postgresql://user:password@[::1]:5432/hiveshelf_test?schema=public',
  ])('allows a known local database: %s', (url) => {
    expect(() => assertSafeReset(url, 'development')).not.toThrow();
  });

  it('allows the test environment', () => {
    expect(() =>
      assertSafeReset(
        'postgresql://user:password@localhost/hiveshelf_test',
        'test',
      ),
    ).not.toThrow();
  });

  it.each([
    [
      'production environment',
      'postgresql://u:p@localhost/hiveshelf',
      'production',
    ],
    ['missing URL', undefined, 'development'],
    ['invalid URL', 'invalid', 'development'],
    ['wrong protocol', 'https://localhost/hiveshelf', 'development'],
    ['remote host', 'postgresql://u:p@db.example.com/hiveshelf', 'development'],
    ['unknown database', 'postgresql://u:p@localhost/other', 'development'],
    [
      'other schema',
      'postgresql://u:p@localhost/hiveshelf?schema=private',
      'development',
    ],
    [
      'connection override',
      'postgresql://u:p@localhost/hiveshelf?host=db.example.com',
      'development',
    ],
    [
      'duplicate schema',
      'postgresql://u:p@localhost/hiveshelf?schema=public&schema=private',
      'development',
    ],
  ])('reject %s', (_label, url, nodeEnv) => {
    expect(() => assertSafeReset(url, nodeEnv)).toThrow();
  });
});
