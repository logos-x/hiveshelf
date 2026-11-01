import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { afterAll, expect } from 'vitest';
import { LivenessResponseSchema } from '@hiveshelf/shared';

describe('API liveness (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health/live returns 200', async () => {
    const response = await request(app!.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(LivenessResponseSchema.parse(response.body)).toEqual({
      status: 'ok',
    });
  });

  it('returns the incoming request ID', async () => {
    const requestId = 'liveness-e2e-123';

    const response = await request(app!.getHttpServer())
      .get('/health/live')
      .set('x-request-id', requestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(requestId);
  });
});
