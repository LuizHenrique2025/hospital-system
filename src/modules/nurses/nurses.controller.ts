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
import { CreateNurseDto } from './dto/create-nurse.dto';
import { UpdateNurseDto } from './dto/update-nurse.dto';
import { NursesService } from './nurses.service';

@ApiTags('Enfermeiros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nurses')
export class NursesController {
  constructor(private readonly nursesService: NursesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar perfil de enfermeiro' })
  @ApiResponse({ status: 201, description: 'Enfermeiro criado com sucesso' })
  @ApiResponse({ status: 409, description: 'COREN ja cadastrado' })
  createNurse(@Body() createNurseDto: CreateNurseDto) {
    return this.nursesService.createNurse(createNurseDto);
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
  @ApiOperation({ summary: 'Listar todos os enfermeiros' })
  @ApiResponse({ status: 200, description: 'Lista de enfermeiros retornada' })
  findAll() {
    return this.nursesService.findAll();
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Buscar enfermeiro por ID do usuario' })
  @ApiParam({ name: 'userId', description: 'ID do usuario' })
  findByUserId(@Param('userId') userId: string) {
    return this.nursesService.findByUserId(userId);
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
  @ApiOperation({ summary: 'Buscar enfermeiro por ID' })
  @ApiParam({ name: 'id', description: 'ID do enfermeiro' })
  @ApiResponse({ status: 200, description: 'Enfermeiro encontrado' })
  @ApiResponse({ status: 404, description: 'Enfermeiro nao encontrado' })
  findOne(@Param('id') id: string) {
    return this.nursesService.findOne(id);
    
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar enfermeiro' })
  @ApiParam({ name: 'id', description: 'ID do enfermeiro' })
  updateNurse(@Param('id') id: string, @Body() updateNurseDto: UpdateNurseDto) {
    return this.nursesService.updateNurse(id, updateNurseDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar enfermeiro' })
  @ApiParam({ name: 'id', description: 'ID do enfermeiro' })
  deleteNurse(@Param('id') id: string) {
    return this.nursesService.deleteNurse(id);
  }
}
