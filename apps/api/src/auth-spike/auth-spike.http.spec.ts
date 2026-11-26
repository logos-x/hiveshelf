import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthSpikeModule } from './auth-spike.module.js';

const origin = 'https://web.hiveshelf.test:8443';

async function createApp(
  enabled: boolean,
  domain?: string,
): Promise<INestApplication<App>> {
  const fixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        skipProcessEnv: true,
        load: [
          () => ({
            NODE_ENV: 'test',
            AUTH_SPIKE_ENABLED: enabled,
            AUTH_SPIKE_COOKIE_DOMAIN: domain,
            WEB_ORIGIN: origin,
          }),
        ],
      }),
      AuthSpikeModule,
    ],
  }).compile();

  const app = fixture.createNestApplication<INestApplication<App>>();
  await app.init();

  return app;
}

function accessCookie(response: Response): string {
  const header = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(header) ? header : [header ?? ''];

  const cookie = cookies.find((value) => value.startsWith('hs_access='));

  if (!cookie) {
    throw new Error('Missing hs_access Set-Cookie');
  }

  return cookie;
}

function requestCookie(response: Response): string {
  const cookie = accessCookie(response).split(';')[0];

  if (!cookie) {
    throw new Error('Missing request cookie');
  }

  return cookie;
}

describe.each([
  { mode: 'A — host-only', domain: undefined },
  { mode: 'B — shared domain', domain: 'hiveshelf.test' },
])('Auth spike HTTP: $mode', ({ domain }) => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp(true, domain);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function login() {
    return request(app.getHttpServer())
      .post('/auth-spike/session')
      .set('Origin', origin)
      .send({ user: 'alice' })
      .expect(201);
  }

  it('phát cookie đúng thuộc tính và không trả token trong JSON', async () => {
    const response = await login();
    const cookie = accessCookie(response);

    expect(cookie).toMatch(/^hs_access=[a-f0-9]{64};/);
    expect(cookie).toMatch(/;\s*HttpOnly(?:;|$)/i);
    expect(cookie).toMatch(/;\s*Secure(?:;|$)/i);
    expect(cookie).toMatch(/;\s*SameSite=Lax(?:;|$)/i);
    expect(cookie).toMatch(/;\s*Path=\/(?:;|$)/i);
    expect(cookie).toMatch(/;\s*Max-Age=600(?:;|$)/i);
    expect(response.headers['cache-control']).toBe('no-store');

    if (domain) {
      expect(cookie).toMatch(/;\s*Domain=hiveshelf\.test(?:;|$)/i);
    } else {
      expect(cookie).not.toMatch(/;\s*Domain=/i);
    }

    expect(response.body).toEqual({
      user: {
        id: 'spike-alice',
        name: 'Alice',
      },
    });
  });

  it('nhận đúng me khi gửi cookie', async () => {
    const loginResponse = await login();
    const cookie = requestCookie(loginResponse);

    const response = await request(app.getHttpServer())
      .get('/auth-spike/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      user: {
        id: 'spike-alice',
        name: 'Alice',
      },
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('trả 401 khi không có cookie', async () => {
    await request(app.getHttpServer()).get('/auth-spike/me').expect(401);
  });

  it('logout xóa cookie đúng scope và thu hồi token cũ', async () => {
    const loginResponse = await login();
    const cookie = requestCookie(loginResponse);

    const logoutResponse = await request(app.getHttpServer())
      .delete('/auth-spike/session')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .expect(204);

    const clearedCookie = accessCookie(logoutResponse);

    expect(clearedCookie).toMatch(/^hs_access=;/);
    expect(clearedCookie).toMatch(/;\s*Path=\/(?:;|$)/i);
    expect(clearedCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');

    if (domain) {
      expect(clearedCookie).toMatch(/;\s*Domain=hiveshelf\.test(?:;|$)/i);
    } else {
      expect(clearedCookie).not.toMatch(/;\s*Domain=/i);
    }

    // Gửi lại token cũ để chứng minh API đã thu hồi phiên.
    await request(app.getHttpServer())
      .get('/auth-spike/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it.each([
    undefined,
    'null',
    'https://attacker.example',
    'https://other.hiveshelf.test:8443',
  ])('chặn tạo phiên với Origin %s', async (invalidOrigin) => {
    const pending = request(app.getHttpServer()).post('/auth-spike/session');

    if (invalidOrigin !== undefined) {
      pending.set('Origin', invalidOrigin);
    }

    const response = await pending.send({ user: 'alice' }).expect(403);

    expect(response.headers['set-cookie']).toBeUndefined();
  });
});

describe('Auth spike HTTP khi tắt', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp(false);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('chặn cả đọc, tạo và xóa phiên bằng 404', async () => {
    await request(app.getHttpServer()).get('/auth-spike/me').expect(404);

    await request(app.getHttpServer())
      .post('/auth-spike/session')
      .set('Origin', origin)
      .send({ user: 'alice' })
      .expect(404);

    await request(app.getHttpServer())
      .delete('/auth-spike/session')
      .set('Origin', origin)
      .expect(404);
  });
});
