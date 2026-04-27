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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('Consultas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Criar nova consulta' })
  @ApiResponse({ status: 201, description: 'Consulta criada com sucesso' })
  createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.createAppointment(dto);
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
  @ApiOperation({ summary: 'Listar consultas' })
  @ApiResponse({ status: 200, description: 'Lista de consultas retornada' })
  findAll() {
    return this.appointmentsService.findAll();
  }

  @Get('patient/:patientId')
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FARMACIA,
    Role.ESTOQUE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Listar consultas de um paciente' })
  @ApiParam({ name: 'patientId', description: 'ID do paciente' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.appointmentsService.findByPatient(patientId);
  }

  @Get('doctor/:doctorId')
  @Roles(
    Role.ADMIN,
    Role.MEDICO,
    Role.ENFERMEIRO,
    Role.ATENDENTE,
    Role.FARMACIA,
    Role.ESTOQUE,
    Role.FATURAMENTO,
  )
  @ApiOperation({ summary: 'Listar consultas de um medico' })
  @ApiParam({ name: 'doctorId', description: 'ID do medico' })
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.appointmentsService.findByDoctor(doctorId);
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
  @ApiOperation({ summary: 'Buscar consulta por ID' })
  @ApiParam({ name: 'id', description: 'ID da consulta' })
  @ApiResponse({ status: 200, description: 'Consulta encontrada' })
  @ApiResponse({ status: 404, description: 'Consulta nao encontrada' })
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar consulta completamente' })
  @ApiParam({ name: 'id', description: 'ID da consulta' })
  updateAppointmentPut(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.updateAppointment(id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar consulta parcialmente' })
  @ApiParam({ name: 'id', description: 'ID da consulta' })
  updateAppointmentPatch(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.updateAppointment(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar consulta' })
  @ApiParam({ name: 'id', description: 'ID da consulta' })
  deleteAppointment(@Param('id') id: string) {
    return this.appointmentsService.deleteAppointment(id);
  }
}
