import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.schema.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
};

describe('validateEnv', () => {
  it('defaults to memory drivers without external credentials', () => {
    const env = validateEnv(baseEnv);

    expect(env.STORAGE_DRIVER).toBe('memory');
    expect(env.EMAIL_DRIVER).toBe('memory');
  });

  it('requires credentials when selecting S3', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        STORAGE_DRIVER: 's3',
      }),
    ).toThrow('S3_ACCESS_KEY');
  });

  it('requires SMTP configuration when selecting SMTP', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        EMAIL_DRIVER: 'smtp',
      }),
    ).toThrow('SMTP_HOST');
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses path style %s as %s', (input, expected) => {
    const env = validateEnv({
      ...baseEnv,
      S3_FORCE_PATH_STYLE: input,
    });

    expect(env.S3_FORCE_PATH_STYLE).toBe(expected);
  });
});
