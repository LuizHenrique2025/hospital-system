import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CbhpmService } from './cbhpm.service';
import { QueryCbhpmDto } from './dto/query-cbhpm.dto';

@ApiTags('CBHPM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cbhpm')
export class CbhpmController {
  constructor(private readonly cbhpmService: CbhpmService) {}

  @Get('imports/summary')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Listar tabelas CBHPM importadas' })
  summarizeImports() {
    return this.cbhpmService.summarizeImports();
  }

  @Get('portes')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Listar portes CBHPM por edicao' })
  summarizePortes(@Query() query: QueryCbhpmDto) {
    return this.cbhpmService.summarizePortes(query);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Buscar procedimentos CBHPM importados' })
  findAll(@Query() query: QueryCbhpmDto) {
    return this.cbhpmService.findAll(query);
  }

  @Get(':codigo')
  @Roles(
    Role.ADMIN,
    Role.ATENDENTE,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar procedimento CBHPM por codigo' })
  @ApiParam({ name: 'codigo', example: '10101012' })
  @ApiResponse({ status: 200, description: 'Procedimento CBHPM encontrado' })
  @ApiResponse({ status: 404, description: 'Procedimento CBHPM nao encontrado' })
  findByCodigo(
    @Param('codigo') codigo: string,
    @Query('editionYear') editionYear?: string,
  ) {
    return this.cbhpmService.findByCodigo(
      codigo,
      editionYear ? Number(editionYear) : undefined,
    );
  }
}
