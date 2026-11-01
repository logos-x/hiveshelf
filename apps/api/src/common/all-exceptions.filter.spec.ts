import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { PinoLogger } from 'nestjs-pino';
import {
  ArgumentsHost,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  HttpException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { vi, type Mock, expect } from 'vitest';
import { z } from 'zod';
import { AppException } from './app.exception.js';

describe('AllExceptionsFilter', () => {
  let logger: { error: Mock; warn: Mock };
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    logger = { error: vi.fn(), warn: vi.fn() };
    filter = new AllExceptionsFilter(logger as unknown as PinoLogger);
  });

  function run(
    exception: unknown,
    opts: { req?: object; headerId?: string; headersSent?: boolean } = {},
  ) {
    const json = vi.fn();
    const res = {
      headersSent: opts.headersSent ?? false,
      getHeader: vi.fn().mockReturnValue(opts.headerId),
      status: vi.fn().mockReturnThis(),
      json,
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => opts.req ?? { id: 'req-123' },
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);
    return { res, body: json.mock.calls[0]?.[0] };
  }

  describe('Mapping status code to exactly status', () => {
    it.each([
      [new NotFoundException(), 404, 'NOT_FOUND'],
      [new UnauthorizedException(), 401, 'UNAUTHORIZED'],
      [new ForbiddenException(), 403, 'FORBIDDEN'],
      [new ConflictException(), 409, 'CONFLICT'],
      [new HttpException('slow down', 429), 429, 'TOO_MANY_REQUESTS'],
      [new HttpException('teapot', 418), 418, 'HTTP_ERROR'],
    ])(`Map status code to exactly status (%#)`, (exception, status, code) => {
      const { res, body } = run(exception);
      expect(res.status).toHaveBeenCalledWith(status);
      expect(body.code).toBe(code);
    });
  });

  describe('validation', () => {
    it("Convert ValidationPipe's message array to VALIDATION_ERROR + details", () => {
      const { res, body } = run(
        new BadRequestException([
          'email must be an email',
          'password is too short',
        ]),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Validation failed');
      expect(body.details).toEqual([
        { message: 'email must be an email' },
        { message: 'password is too short' },
      ]);
    });

    it('ZodError returns 400 VALIDATION_ERROR and details has field', () => {
      const result = z
        .object({ name: z.string().min(3) })
        .safeParse({ name: 'a' });
      if (result.success) throw new Error('schema must be fail');

      const { res, body } = run(result.error);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual([
        expect.objectContaining({ field: 'name' }),
      ]);
    });
  });

  it('using code and message from AppException', () => {
    const { res, body } = run(
      new AppException('BOOK_DUPLICATED', 'This book already exists', 409),
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(body.code).toBe('BOOK_DUPLICATED');
    expect(body.message).toBe('This book already exists');
  });

  it('Map 503 to SERVICE_UNAVAILABLE', () => {
    const { res, body } = run(new ServiceUnavailableException());
    expect(res.status).toHaveBeenCalledWith(503);
    expect(body.code).toBe('SERVICE_UNAVAILABLE');
  });

  describe('5xx error / unforeseen', () => {
    it('returns 500 INTERNAL_ERROR and DO NOT disclose internal information', () => {
      const { res, body } = run(new Error('boom: password=hunter2'));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        requestId: 'req-123',
      });

      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('hunter2');
      expect(serialized).not.toContain('boom');
      expect(serialized).not.toContain('stack');
    });

    it('normalizes InternalServerErrorException', () => {
      const { res, body } = run(
        new InternalServerErrorException('query table users issue'),
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        requestId: 'req-123',
      });
    });

    it('does not expose internal details for 5xx', () => {
      const { body } = run(
        new AppException('DATABASE_FAILURE', 'Private database failure', 500, [
          { message: 'Private SQL diagnostic' },
        ]),
      );

      expect(body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        requestId: 'req-123',
      });

      expect(body).not.toHaveProperty('details');
    });

    it('write stack into log on level error', () => {
      const error = new Error('boom');
      run(error);
      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        expect.any(String),
      );
    });
  });

  describe('logging', () => {
    it('4xx error records warning, not error', () => {
      run(new NotFoundException());
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('requestId & headers', () => {
    it('get requestId from header response when req.id is not available', () => {
      const { body } = run(new NotFoundException(), {
        req: {},
        headerId: 'hdr-1',
      });
      expect(body.requestId).toBe('hdr-1');
    });

    it('do nothing once the response has been sent', () => {
      const { res } = run(new Error('late'), { headersSent: true });
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
