import { Controller, Get } from '@nestjs/common';
import { PublicApi } from './shared/internal-auth.guard';

@Controller('health')
export class HealthController {
  @Get()
  @PublicApi()
  health() {
    return { ok: true, service: 'seo-machine-api', version: '0.4.0' };
  }
}
