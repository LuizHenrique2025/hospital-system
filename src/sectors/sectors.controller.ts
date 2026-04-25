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
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { SectorsService } from './sectors.service';

@ApiTags('Setores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar setor' })
  @ApiResponse({ status: 201, description: 'Setor criado com sucesso' })
  createSector(@Body() dto: CreateSectorDto) {
    return this.sectorsService.createSector(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Listar setores' })
  findAll() {
    return this.sectorsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MEDICO, Role.ENFERMEIRO)
  @ApiOperation({ summary: 'Buscar setor por ID' })
  @ApiParam({ name: 'id', description: 'ID do setor' })
  findOne(@Param('id') id: string) {
    return this.sectorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar setor' })
  @ApiParam({ name: 'id', description: 'ID do setor' })
  updateSector(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.sectorsService.updateSector(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir setor' })
  @ApiParam({ name: 'id', description: 'ID do setor' })
  deleteSector(@Param('id') id: string) {
    return this.sectorsService.deleteSector(id);
  }
}
