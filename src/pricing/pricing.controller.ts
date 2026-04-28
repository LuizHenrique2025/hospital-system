import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CreateCbhpmRangeDto } from './dto/create-cbhpm-range.dto';
import { CreatePricingTableDto } from './dto/create-pricing-table.dto';
import { CreateProcedurePriceDto } from './dto/create-procedure-price.dto';
import { QueryPricingTableDto } from './dto/query-pricing-table.dto';
import { QueryProcedurePriceDto } from './dto/query-procedure-price.dto';
import { UpdatePricingTableDto } from './dto/update-pricing-table.dto';
import { UpdateProcedurePriceDto } from './dto/update-procedure-price.dto';
import { PricingService } from './pricing.service';

@ApiTags('Tabelas de Preco')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing-tables')
export class PricingTablesController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Criar tabela de preco' })
  @ApiResponse({ status: 201, description: 'Tabela criada com sucesso' })
  createPricingTable(@Body() dto: CreatePricingTableDto) {
    return this.pricingService.createPricingTable(dto);
  }

  @Post('cbhpm-range')
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Criar tabelas CBHPM por intervalo de anos' })
  createCbhpmRange(@Body() dto: CreateCbhpmRangeDto) {
    return this.pricingService.createCbhpmRange(dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.ATENDENTE,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar tabelas de preco' })
  findPricingTables(@Query() query: QueryPricingTableDto) {
    return this.pricingService.findPricingTables(query);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.ATENDENTE,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar tabela de preco por ID' })
  @ApiParam({ name: 'id', description: 'ID da tabela' })
  findPricingTable(@Param('id') id: string) {
    return this.pricingService.findPricingTable(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Atualizar tabela de preco' })
  updatePricingTable(
    @Param('id') id: string,
    @Body() dto: UpdatePricingTableDto,
  ) {
    return this.pricingService.updatePricingTable(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir tabela de preco' })
  deletePricingTable(@Param('id') id: string) {
    return this.pricingService.deletePricingTable(id);
  }
}

@ApiTags('Valores de Procedimentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('procedure-prices')
export class ProcedurePricesController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Cadastrar valor de procedimento por tabela' })
  createProcedurePrice(@Body() dto: CreateProcedurePriceDto) {
    return this.pricingService.createProcedurePrice(dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.ATENDENTE,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar valores de procedimentos' })
  findProcedurePrices(@Query() query: QueryProcedurePriceDto) {
    return this.pricingService.findProcedurePrices(query);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Atualizar valor de procedimento' })
  updateProcedurePrice(
    @Param('id') id: string,
    @Body() dto: UpdateProcedurePriceDto,
  ) {
    return this.pricingService.updateProcedurePrice(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir valor de procedimento' })
  deleteProcedurePrice(@Param('id') id: string) {
    return this.pricingService.deleteProcedurePrice(id);
  }
}
