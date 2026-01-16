import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  createPatient(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.createPatient(createPatientDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Listar todos os pacientes' })
  @ApiResponse({ status: 200, description: 'Lista de pacientes retornada' })
  findAll(@Query() query: QueryPatientDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Get('cpf/:cpf')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar paciente por CPF' })
  @ApiParam({ name: 'cpf', description: 'CPF do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  findByCpf(@Param('cpf') cpf: string) {
    return this.patientsService.findByCpf(cpf);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar paciente completamente (PUT)' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente atualizado' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  updatePatientPut(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(id, updatePatientDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar paciente parcialmente (PATCH)' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente atualizado' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  updatePatientPatch(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(id, updatePatientDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar paciente (somente ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente excluído' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  deletePatient(@Param('id') id: string) {
    return this.patientsService.deletePatient(id);
  }
}
