import { describe, expect, it } from 'vitest';
import { envSchema } from './env.schema.js';

const baseEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
};

describe('Auth spike environment configuration', () => {
  it('mặc định tắt spike', () => {
    const env = envSchema.parse(baseEnv);

    expect(env.AUTH_SPIKE_ENABLED).toBe(false);
  });

  it('cho phép bật spike trong development', () => {
    const env = envSchema.parse({
      ...baseEnv,
      AUTH_SPIKE_ENABLED: 'true',
    });

    expect(env.AUTH_SPIKE_ENABLED).toBe(true);
  });

  it('chuyển chuỗi false thành boolean false', () => {
    const env = envSchema.parse({
      ...baseEnv,
      AUTH_SPIKE_ENABLED: 'false',
    });

    expect(env.AUTH_SPIKE_ENABLED).toBe(false);
  });

  it('từ chối bật spike trong production', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      NODE_ENV: 'production',
      AUTH_SPIKE_ENABLED: 'true',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['AUTH_SPIKE_ENABLED'],
            message: 'Auth spike must not be enabled in production',
          }),
        ]),
      );
    }
  });

  it('cho phép production khi spike tắt', () => {
    const env = envSchema.parse({
      ...baseEnv,
      NODE_ENV: 'production',
      AUTH_SPIKE_ENABLED: 'false',
    });

    expect(env.AUTH_SPIKE_ENABLED).toBe(false);
  });

  it('từ chối giá trị cờ không hợp lệ', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      AUTH_SPIKE_ENABLED: 'yes',
    });

    expect(result.success).toBe(false);
  });
});
