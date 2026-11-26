import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.ts';

@Injectable()
export class AuthSpikeGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(): boolean {
    const enabled = this.config.get('AUTH_SPIKE_ENABLED', {
      infer: true,
    });
    const enviroment = this.config.get('NODE_ENV', {
      infer: true,
    });

    if (!enabled || enviroment === 'production') throw new NotFoundException();

    return true;
  }
}
