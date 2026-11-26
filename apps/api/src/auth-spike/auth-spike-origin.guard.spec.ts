import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Env } from '../config/env.schema.js';
import { AuthSpikeOriginGuard } from './auth-spike-origin.guard.js';

const allowedOrigin = 'https://web.hiveshelf.test:8443';

function createContext(method: string, origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: origin === undefined ? {} : { origin },
      }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard() {
  const config = new ConfigService<Env, true>({
    WEB_ORIGIN: `http://localhost:3000, ${allowedOrigin}`,
  });

  return new AuthSpikeOriginGuard(config);
}

describe('AuthSpikeOriginGuard', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'cho phép %s không có Origin',
    (method) => {
      expect(createGuard().canActivate(createContext(method))).toBe(true);
    },
  );

  describe.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'request ghi %s',
    (method) => {
      it('chấp nhận Origin khớp allowlist', () => {
        expect(
          createGuard().canActivate(createContext(method, allowedOrigin)),
        ).toBe(true);
      });

      it.each([
        undefined,
        'null',
        'https://attacker.example',
        'https://other.hiveshelf.test:8443',
        'https://web.hiveshelf.test.attacker.example:8443',
        'https://web.hiveshelf.test:9443',
      ])('từ chối Origin %s', (origin) => {
        expect(() =>
          createGuard().canActivate(createContext(method, origin)),
        ).toThrow(ForbiddenException);
      });
    },
  );
});
