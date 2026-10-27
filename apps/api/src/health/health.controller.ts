import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@hiveshelf/shared';
import { HealthResponseSchema } from '@hiveshelf/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return HealthResponseSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.2',
    });
  }
}
