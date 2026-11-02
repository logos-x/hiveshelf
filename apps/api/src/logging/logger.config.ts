import { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

const SECRET_FIELDS = ['password', 'token', 'accessToken', 'refreshToken'];

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',

  ...SECRET_FIELDS.flatMap((field) => [
    field,
    `*.${field}`,
    `req.body.${field}`,
  ]),
];

const SAFE_ID = /^[\w-]{8,128}$/;

export function buildLoggerParams(opts: {
  isProd: boolean;
  level: string;
}): Params {
  return {
    pinoHttp: {
      level: opts.level,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && SAFE_ID.test(incoming)
            ? incoming
            : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      transport: opts.isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { singleLine: true, colorize: true },
          },
      autoLogging: {
        ignore: (req) => req.url?.split('?')[0] === '/health/live',
      },
    },
  };
}
