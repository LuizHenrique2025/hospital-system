import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Médicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar perfil de médico' })
  @ApiResponse({ status: 201, description: 'Médico criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CRM já cadastrado' })
  createDoctor(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(createDoctorDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Listar todos os médicos' })
  @ApiResponse({ status: 200, description: 'Lista de médicos retornada' })
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar médico por ID' })
  @ApiParam({ name: 'id', description: 'ID do médico' })
  @ApiResponse({ status: 200, description: 'Médico encontrado' })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar médico por ID do usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Médico encontrado' })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  findByUserId(@Param('userId') userId: string) {
    return this.doctorsService.findByUserId(userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar médico' })
  @ApiParam({ name: 'id', description: 'ID do médico' })
  @ApiResponse({ status: 200, description: 'Médico atualizado' })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  updateDoctor(
    @Param('id') id: string,
    @Body() updateDoctorDto: UpdateDoctorDto,
  ) {
    return this.doctorsService.updateDoctor(id, updateDoctorDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar médico (somente ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID do médico' })
  @ApiResponse({ status: 200, description: 'Médico excluído' })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  deleteDoctor(@Param('id') id: string) {
    return this.doctorsService.deleteDoctor(id);
  }
}
