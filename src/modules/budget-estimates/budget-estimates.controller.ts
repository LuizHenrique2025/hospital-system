import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BudgetEstimatesService } from './budget-estimates.service';
import { ApproveBudgetEstimateDto } from './dto/approve-budget-estimate.dto';
import { CreateBudgetEstimateDto } from './dto/create-budget-estimate.dto';
import { QueryBudgetEstimateDto } from './dto/query-budget-estimate.dto';

const budgetReaders = [
  Role.ADMIN,
  Role.ATENDENTE,
  Role.MEDICO,
  Role.ENFERMEIRO,
  Role.FATURAMENTO,
];

@ApiTags('Orcamentos Hospitalares')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('budget-estimates')
export class BudgetEstimatesController {
  constructor(private readonly budgetEstimatesService: BudgetEstimatesService) {}

  @Post('calculate')
  @Roles(...budgetReaders)
  @ApiOperation({ summary: 'Calcular orcamento sem salvar' })
  calculateEstimate(@Body() dto: CreateBudgetEstimateDto) {
    return this.budgetEstimatesService.calculateEstimate(dto);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Criar orcamento hospitalar' })
  @ApiResponse({ status: 201, description: 'Orcamento criado com sucesso' })
  createEstimate(
    @Body() dto: CreateBudgetEstimateDto,
    @GetUser('id') userId: string,
  ) {
    return this.budgetEstimatesService.createEstimate(dto, userId);
  }

  @Get()
  @Roles(...budgetReaders)
  @ApiOperation({ summary: 'Buscar orcamentos hospitalares' })
  findAll(@Query() query: QueryBudgetEstimateDto) {
    return this.budgetEstimatesService.findAll(query);
  }

  @Get(':id')
  @Roles(...budgetReaders)
  @ApiOperation({ summary: 'Buscar orcamento por ID' })
  @ApiParam({ name: 'id', description: 'ID do orcamento' })
  findOne(@Param('id') id: string) {
    return this.budgetEstimatesService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Aprovar orcamento e opcionalmente gerar guia' })
  @ApiParam({ name: 'id', description: 'ID do orcamento' })
  approveEstimate(
    @Param('id') id: string,
    @Body() dto: ApproveBudgetEstimateDto,
    @GetUser('id') userId: string,
  ) {
    return this.budgetEstimatesService.approveEstimate(id, dto, userId);
  }
}
