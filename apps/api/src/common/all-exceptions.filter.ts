import { ERROR_CODES, ApiError, type ApiErrorDetail } from '@hiveshelf/shared';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

const CODE_BY_STATUS: Record<number, string> = {
  400: ERROR_CODES.BAD_REQUEST,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  429: ERROR_CODES.TOO_MANY_REQUESTS,
  503: ERROR_CODES.SERVICE_UNAVAILABLE,
};
const GENERIC_5XX = 'Internal Server Error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    if (res.headersSent) return;

    const requestId = String(
      req.id ?? res.getHeader('x-request-id') ?? 'unknown',
    );
    const body = this.toApiError(exception, requestId);

    if (body.statusCode >= 500) {
      this.logger.error({ err: exception }, 'Unhandled exception');
    } else {
      this.logger.warn(
        { code: body.code, statusCode: body.statusCode },
        body.message,
      );
    }
    res.status(body.statusCode).json(body);
  }

  private toApiError(e: unknown, requestId: string): ApiError {
    if (e instanceof ZodError) {
      return {
        statusCode: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: e.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
        requestId,
      };
    }

    if (e instanceof HttpException) {
      const status = e.getStatus();
      const r = e.getResponse();
      let code = CODE_BY_STATUS[status] ?? 'HTTP_ERROR';
      let message = e.message;
      let details: ApiErrorDetail[] | undefined;

      if (typeof r === 'object' && r !== null) {
        const o = r as {
          message?: string | string[];
          code?: string;
          details?: ApiErrorDetail[];
        };
        if (Array.isArray(o.message)) {
          code = ERROR_CODES.VALIDATION_ERROR;
          message = 'Validation failed';
          details = o.message.map((m) => ({ message: m }));
        } else if (typeof o.message === 'string') {
          message = o.message;
        }
        if (o.code) code = o.code;
        if (o.details) details = o.details;
      }

      if (status >= 500) message = GENERIC_5XX;
      return {
        statusCode: status,
        code,
        message,
        ...(details && { details }),
        requestId,
      };
    }

    return {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: GENERIC_5XX,
      requestId,
    };
  }
}
