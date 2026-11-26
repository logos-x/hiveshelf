import { Module } from '@nestjs/common';
import { AuthSpikeController } from './auth-spike.controller.ts';
import { AuthSpikeGuard } from './auth-spike.guard.ts';
import { AuthSpikeSessionService } from './auth-spike-session.service.ts';
import { AuthSpikeOriginGuard } from './auth-spike-origin.guard.ts';

@Module({
  controllers: [AuthSpikeController],
  providers: [AuthSpikeGuard, AuthSpikeOriginGuard, AuthSpikeSessionService],
})
export class AuthSpikeModule {}
