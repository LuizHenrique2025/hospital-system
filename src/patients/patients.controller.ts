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
import { CreatePatientDto } from './dto/create-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('Pacientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Criar novo paciente' })
  @ApiResponse({ status: 201, description: 'Paciente criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CPF ja cadastrado' })
  createPatient(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.createPatient(createPatientDto);
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
  @ApiOperation({ summary: 'Listar todos os pacientes' })
  @ApiResponse({ status: 200, description: 'Lista de pacientes retornada' })
  findAll(@Query() query: QueryPatientDto) {
    return this.patientsService.findAll(query);
  }

  @Get('cpf/:cpf')
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FARMACIA,
    Role.ESTOQUE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Buscar paciente por CPF' })
  @ApiParam({ name: 'cpf', description: 'CPF do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente nao encontrado' })
  findByCpf(@Param('cpf') cpf: string) {
    return this.patientsService.findByCpf(cpf);
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
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente nao encontrado' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar paciente completamente' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  updatePatientPut(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(id, updatePatientDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar paciente parcialmente' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  updatePatientPatch(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(id, updatePatientDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar paciente' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  deletePatient(@Param('id') id: string) {
    return this.patientsService.deletePatient(id);
  }
}
