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
  Put,
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
import { CreateExamOrderDto } from './dto/create-exam-order.dto';
import { QueryExamOrderDto } from './dto/query-exam-order.dto';
import { UpdateExamOrderDto } from './dto/update-exam-order.dto';
import { ExamOrdersService } from './exam-orders.service';

@ApiTags('Pedidos de Exames')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exam-orders')
export class ExamOrdersController {
  constructor(private readonly examOrdersService: ExamOrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Criar pedido de exames' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso' })
  createExamOrder(@Body() dto: CreateExamOrderDto) {
    return this.examOrdersService.createExamOrder(dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar pedidos de exames' })
  findAll(@Query() query: QueryExamOrderDto) {
    return this.examOrdersService.findAll(query);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar pedido de exames por ID' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  findOne(@Param('id') id: string) {
    return this.examOrdersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Atualizar pedido de exames completamente' })
  updateExamOrderPut(
    @Param('id') id: string,
    @Body() dto: UpdateExamOrderDto,
  ) {
    return this.examOrdersService.updateExamOrder(id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Atualizar pedido de exames parcialmente' })
  updateExamOrderPatch(
    @Param('id') id: string,
    @Body() dto: UpdateExamOrderDto,
  ) {
    return this.examOrdersService.updateExamOrder(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir pedido de exames' })
  deleteExamOrder(@Param('id') id: string) {
    return this.examOrdersService.deleteExamOrder(id);
  }
}
