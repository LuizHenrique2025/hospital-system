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
import { NursesService } from './nurses.service';
import { CreateNurseDto } from './dto/create-nurse.dto';
import { UpdateNurseDto } from './dto/update-nurse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
  @ApiResponse({ status: 409, description: 'COREN já cadastrado' })
  createNurse(@Body() createNurseDto: CreateNurseDto) {
    return this.nursesService.createNurse(createNurseDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Listar todos os enfermeiros' })
  @ApiResponse({ status: 200, description: 'Lista de enfermeiros retornada' })
  findAll() {
    return this.nursesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar enfermeiro por ID' })
  @ApiParam({ name: 'id', description: 'ID do enfermeiro' })
  @ApiResponse({ status: 200, description: 'Enfermeiro encontrado' })
  @ApiResponse({ status: 404, description: 'Enfermeiro não encontrado' })
  findOne(@Param('id') id: string) {
    return this.nursesService.findOne(id);
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Buscar enfermeiro por ID do usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Enfermeiro encontrado' })
  @ApiResponse({ status: 404, description: 'Enfermeiro não encontrado' })
  findByUserId(@Param('userId') userId: string) {
    return this.nursesService.findByUserId(userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar enfermeiro' })
  @ApiParam({ name: 'id', description: 'ID do enfermeiro' })
  @ApiResponse({ status: 200, description: 'Enfermeiro atualizado' })
  @ApiResponse({ status: 404, description: 'Enfermeiro não encontrado' })
  updateNurse(
    @Param('id') id: string,
    @Body() updateNurseDto: UpdateNurseDto,
  ) {
    return this.nursesService.updateNurse(id, updateNurseDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar enfermeiro (somente ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID do enfermeiro' })
  @ApiResponse({ status: 200, description: 'Enfermeiro excluído' })
  @ApiResponse({ status: 404, description: 'Enfermeiro não encontrado' })
  deleteNurse(@Param('id') id: string) {
    return this.nursesService.deleteNurse(id);
  }
}
