import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Env } from '../config/env.schema.js';
import { AuthSpikeGuard } from './auth-spike.guard.js';

describe('AuthSpikeGuard', () => {
  it.each(['development', 'test'] as const)(
    'cho phép spike khi bật trong %s',
    (environment) => {
      const config = new ConfigService<Env, true>({
        NODE_ENV: environment,
        AUTH_SPIKE_ENABLED: true,
      });

      expect(new AuthSpikeGuard(config).canActivate()).toBe(true);
    },
  );

  it.each(['development', 'test', 'production'] as const)(
    'trả 404 khi spike tắt trong %s',
    (environment) => {
      const config = new ConfigService<Env, true>({
        NODE_ENV: environment,
        AUTH_SPIKE_ENABLED: false,
      });

      expect(() => new AuthSpikeGuard(config).canActivate()).toThrow(
        NotFoundException,
      );
    },
  );

  it('vẫn chặn production ngay cả khi cờ bị bật', () => {
    const config = new ConfigService<Env, true>({
      NODE_ENV: 'production',
      AUTH_SPIKE_ENABLED: true,
    });

    expect(() => new AuthSpikeGuard(config).canActivate()).toThrow(
      NotFoundException,
    );
  });
});
