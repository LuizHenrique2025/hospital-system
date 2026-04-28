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
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { QueryProcedureDto } from './dto/query-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { ProceduresService } from './procedures.service';

@ApiTags('Procedimentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Criar procedimento ou exame' })
  @ApiResponse({ status: 201, description: 'Procedimento criado com sucesso' })
  createProcedure(@Body() dto: CreateProcedureDto) {
    return this.proceduresService.createProcedure(dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FARMACIA,
    Role.ESTOQUE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar procedimentos e exames' })
  findAll(@Query() query: QueryProcedureDto) {
    return this.proceduresService.findAll(query);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FARMACIA,
    Role.ESTOQUE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar procedimento por ID' })
  @ApiParam({ name: 'id', description: 'ID do procedimento' })
  findOne(@Param('id') id: string) {
    return this.proceduresService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Atualizar procedimento completamente' })
  updateProcedurePut(
    @Param('id') id: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    return this.proceduresService.updateProcedure(id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Atualizar procedimento parcialmente' })
  updateProcedurePatch(
    @Param('id') id: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    return this.proceduresService.updateProcedure(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir procedimento' })
  deleteProcedure(@Param('id') id: string) {
    return this.proceduresService.deleteProcedure(id);
  }
}
