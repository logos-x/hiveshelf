import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { afterAll, beforeAll, expect } from 'vitest';
import { LivenessResponseSchema } from '@hiveshelf/shared';
import { afterEach, vi } from 'vitest';
import { ERROR_CODES } from '@hiveshelf/shared';
import { PrismaService } from '../src/prisma/prisma.service.ts';

describe('API liveness (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
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

  it('generates a request ID when the header is missing', async () => {
    const response = await request(app!.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('replaces an invalid request ID', async () => {
    const response = await request(app!.getHttpServer())
      .get('/health/live')
      .set('x-request-id', 'invalid id')
      .expect(200);

    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-request-id']).not.toBe('invalid id');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('GET /health/ready returns 200 with a real database', async () => {
    const response = await request(app!.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /health returns 200 with a real database', async () => {
    const response = await request(app!.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('seed executed twice leaves one bootstrap record', async () => {
    const prisma = app!.get(PrismaService);

    expect(
      await prisma.systemInfo.count({
        where: { key: 'bootstrap' },
      }),
    ).toBe(1);
  });

  it('returns 503 for a database error while liveness remains available', async () => {
    const prisma = app!.get(PrismaService);

    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(
      new Error('Simulated database failure'),
    );

    const response = await request(app!.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
    });

    await request(app!.getHttpServer()).get('/health/live').expect(200);
  });

  it('returns 503 when the readiness query does not settle', async () => {
    const prisma = app!.get(PrismaService);

    vi.spyOn(prisma, '$queryRaw').mockImplementationOnce(() =>
      Object.assign(new Promise<never>(() => {}), {
        [Symbol.toStringTag]: 'PrismaPromise' as const,
      }),
    );

    await request(app!.getHttpServer())
      .get('/health/ready')
      .timeout({ response: 4500, deadline: 5000 })
      .expect(503);
  });
});
