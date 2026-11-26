import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthSpikeGuard } from './auth-spike.guard.ts';
import { AuthSpikeOriginGuard } from './auth-spike-origin.guard.ts';
import { z } from 'zod';
import {
  AuthSpikeSessionService,
  SPIKE_SESSION_TTL_MS,
} from './auth-spike-session.service.ts';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.ts';

const sessionBodySchema = z.object({
  user: z.enum(['alice', 'bob']),
});

@Controller('auth-spike')
@UseGuards(AuthSpikeGuard, AuthSpikeOriginGuard)
export class AuthSpikeController {
  constructor(
    private readonly sessions: AuthSpikeSessionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('session')
  @Header('Cache-Control', 'no-store')
  createSession(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = sessionBodySchema.safeParse(body);

    if (!parsed.success)
      throw new BadRequestException('user must be alice or bob');

    this.sessions.revoke(this.readToken(request));

    const token = this.sessions.create(parsed.data.user);

    response.cookie('hs_access', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SPIKE_SESSION_TTL_MS,
      domain: this.config.get('AUTH_SPIKE_COOKIE_DOMAIN', {
        infer: true,
      }),
    });

    return {
      user: this.sessions.findUser(token),
    };
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() request: Request) {
    const user = this.sessions.findUser(this.readToken(request));

    if (!user) throw new UnauthorizedException('No valid spike session');

    return { user };
  }

  @Delete('session')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  deleteSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): void {
    this.sessions.revoke(this.readToken(request));

    response.clearCookie('hs_access', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: this.config.get('AUTH_SPIKE_COOKIE_DOMAIN', {
        infer: true,
      }),
    });
  }

  private readToken(request: Request): string | undefined {
    const cookies = (request.headers.cookie ?? '').split(';');

    for (const cookie of cookies) {
      const match = /^hs_access=([a-f0-9]{64})$/.exec(cookie.trim());

      if (match) return match[1];
    }

    return undefined;
  }
}
