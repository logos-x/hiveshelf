import { Controller, Get } from '@nestjs/common';
import type { LivenessResponse } from '@hiveshelf/shared';

@Controller('health')
export class HealthController {
  @Get('live')
  liveness(): LivenessResponse {
    return { status: 'ok' };
  }
}
