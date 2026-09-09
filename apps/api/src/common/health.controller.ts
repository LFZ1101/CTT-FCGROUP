import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  status() {
    return {
      status: 'ok',
      service: 'cct-intelligence-api',
      timestamp: new Date().toISOString(),
    };
  }
}
