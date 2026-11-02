import { describe, it, expect } from 'vitest';
import { assertTestDatabase } from './database.guard.ts';

const developmentUrl = 'postgresql://user:password@localhost:5432/hiveshelf';

describe('test database isolation', () => {
  it('accepts a separate local test database', () => {
    expect(() =>
      assertTestDatabase(
        developmentUrl,
        'postgresql://user:password@localhost:5432/hiveshelf_test',
      ),
    ).not.toThrow();
  });

  it('rejects a missing test URL', () => {
    expect(() => assertTestDatabase(developmentUrl, undefined)).toThrow();
  });

  it('rejects the same database despite different credentials and host alias', () => {
    expect(() =>
      assertTestDatabase(
        'posgresql://dev:password@localhost:5432/hiveshelf_test',
        'postgresql://test:other@127.0.0.1:5432/hiveshelf_test?schema=public',
      ),
    ).toThrow();
  });

  it.each([
    'postgresql://u:p@localhost/hiveshelf',
    'postgresql://u:p@remote.example.com/hiveshelf_test',
    'postgresql://u:p@localhost/hiveshelf_test?schema=private',
    'postgresql://u:p@localhost/hiveshelf_test?host=remote.example.com',
  ])('rejects an unsafe test target: %s', (url) => {
    expect(() => assertTestDatabase(developmentUrl, url)).toThrow();
  });
});
