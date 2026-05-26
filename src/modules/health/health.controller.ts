import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificar status da aplicacao e do banco' })
  @ApiResponse({ status: 200, description: 'Aplicacao saudavel' })
  async check() {
    return this.healthService.check();
  }
}
