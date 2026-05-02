import {
  Body,
  Controller,
  Get,
  Param,
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

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingGuidesService } from './billing-guides.service';
import { CreateBillingGuideDto } from './dto/create-billing-guide.dto';
import { MoveBillingGuideDto } from './dto/move-billing-guide.dto';
import { QueryBillingGuideDto } from './dto/query-billing-guide.dto';

const guideReaders = [
  Role.ADMIN,
  Role.ATENDENTE,
  Role.MEDICO,
  Role.ENFERMEIRO,
  Role.FARMACIA,
  Role.ESTOQUE,
  Role.FATURAMENTO,
];

@ApiTags('Movimentacao de Guias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing/guides')
export class BillingGuidesController {
  constructor(private readonly billingGuidesService: BillingGuidesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Abrir guia de faturamento' })
  @ApiResponse({ status: 201, description: 'Guia aberta com sucesso' })
  createBillingGuide(
    @Body() dto: CreateBillingGuideDto,
    @GetUser('id') userId: string,
  ) {
    return this.billingGuidesService.createBillingGuide(dto, userId);
  }

  @Get()
  @Roles(...guideReaders)
  @ApiOperation({ summary: 'Buscar guias e status de movimentacao' })
  findAll(@Query() query: QueryBillingGuideDto) {
    return this.billingGuidesService.findAll(query);
  }

  @Get(':id')
  @Roles(...guideReaders)
  @ApiOperation({ summary: 'Buscar guia por ID com historico' })
  @ApiParam({ name: 'id', description: 'ID da guia' })
  findOne(@Param('id') id: string) {
    return this.billingGuidesService.findOne(id);
  }

  @Get(':id/movements')
  @Roles(...guideReaders)
  @ApiOperation({ summary: 'Listar linha do tempo de uma guia' })
  @ApiParam({ name: 'id', description: 'ID da guia' })
  listMovements(@Param('id') id: string) {
    return this.billingGuidesService.listMovements(id);
  }

  @Post(':id/movements')
  @Roles(...guideReaders)
  @ApiOperation({ summary: 'Registrar movimentacao de guia' })
  @ApiParam({ name: 'id', description: 'ID da guia' })
  moveBillingGuide(
    @Param('id') id: string,
    @Body() dto: MoveBillingGuideDto,
    @GetUser('id') userId: string,
  ) {
    return this.billingGuidesService.moveBillingGuide(id, dto, userId);
  }
}
