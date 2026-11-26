import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.ts';
import type { Request } from 'express';

@Injectable()
export class AuthSpikeOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const allowedOrigins = this.config
      .get('WEB_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const origin = request.headers.origin;

    if (!origin || origin === 'null' || !allowedOrigins.includes(origin))
      throw new ForbiddenException('Origin is not allowed');

    return true;
  }
}
