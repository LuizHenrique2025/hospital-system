import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CommunicationsService } from './communications.service';
import { CommunicationDashboardDto } from './dto/communication-dashboard.dto';

@ApiTags('Comunicacao interna')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Resumo da aba Principal com comunicados, avisos e emails internos',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados da comunicacao interna retornados com sucesso',
    type: CommunicationDashboardDto,
  })
  getDashboard() {
    return this.communicationsService.getDashboard();
  }
}
