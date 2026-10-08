import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@nexa/types';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.0.0',
    };
  }
}
