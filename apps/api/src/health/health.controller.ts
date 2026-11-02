import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { LivenessResponse } from '@hiveshelf/shared';
import { PrismaService } from '../prisma/prisma.service.ts';
import { clearTimeout } from 'node:timers';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  liveness(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get(['', 'ready'])
  async readiness(): Promise<{ status: 'ok' }> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Database readiness timed out.'));
        }, 3000);
      });

      await Promise.race([this.prisma.$queryRaw`SELECT 1`, deadline]);

      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }
}
