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
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorsService } from './doctors.service';

@ApiTags('Medicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar perfil de medico' })
  @ApiResponse({ status: 201, description: 'Medico criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CRM ja cadastrado' })
  createDoctor(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(createDoctorDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Listar todos os medicos' })
  @ApiResponse({ status: 200, description: 'Lista de medicos retornada' })
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar medico por ID do usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  findByUserId(@Param('userId') userId: string) {
    return this.doctorsService.findByUserId(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar medico por ID' })
  @ApiParam({ name: 'id', description: 'ID do medico' })
  @ApiResponse({ status: 200, description: 'Medico encontrado' })
  @ApiResponse({ status: 404, description: 'Medico nao encontrado' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar medico' })
  @ApiParam({ name: 'id', description: 'ID do medico' })
  updateDoctor(
    @Param('id') id: string,
    @Body() updateDoctorDto: UpdateDoctorDto,
  ) {
    return this.doctorsService.updateDoctor(id, updateDoctorDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar medico' })
  @ApiParam({ name: 'id', description: 'ID do medico' })
  deleteDoctor(@Param('id') id: string) {
    return this.doctorsService.deleteDoctor(id);
  }
}
