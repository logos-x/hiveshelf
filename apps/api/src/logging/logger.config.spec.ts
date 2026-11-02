import { buildLoggerParams } from './logger.config.js';
import pino from 'pino';
import { expect } from 'vitest';

function captureLog(data: Record<string, unknown>): unknown {
  const options = buildLoggerParams({
    isProd: true,
    level: 'info',
  }).pinoHttp;

  if (!options || Array.isArray(options) || 'write' in options) {
    throw new Error('Expected pinoHttp options object');
  }

  let output = '';

  const logger = pino(options, {
    write(chunk: string) {
      output += chunk;
    },
  });

  logger.info(data);

  return JSON.parse(output) as unknown;
}

describe('logger.config - redaction', () => {
  it('hide authorization information in headers', () => {
    const log = captureLog({
      req: {
        headers: {
          authorization: 'Bearer fake-access-token',
          cookie: 'session=fake-session',
        },
      },
      res: {
        headers: {
          'set-cookie': ['session=fake-set-cookie'],
        },
      },
    });

    expect(log).toMatchObject({
      req: {
        headers: {
          authorization: '[REDACTED]',
          cookie: '[REDACTED]',
        },
      },
      res: {
        headers: {
          'set-cookie': '[REDACTED]',
        },
      },
    });
  });

  it('hide secret in root, payload and request body', () => {
    const log = captureLog({
      password: 'fake-root-password',
      payload: {
        token: 'fake-token',
      },
      req: {
        body: {
          password: 'fake-root-password',
        },
      },
    });

    expect(log).toMatchObject({
      password: '[REDACTED]',
      payload: {
        token: '[REDACTED]',
      },
      req: {
        body: {
          password: '[REDACTED]',
        },
      },
    });
  });

  it('keep the statusCode and requestId intact when hiding the secret', () => {
    const log = captureLog({
      password: 'fake-password',
      statusCode: 401,
      requestId: 'req-123456',
    });

    expect(log).toMatchObject({
      password: '[REDACTED]',
      statusCode: 401,
      requestId: 'req-123456',
    });
  });
});
