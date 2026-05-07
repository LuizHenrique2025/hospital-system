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
import { DocumentTemplatesService } from './document-templates.service';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { QueryDocumentTemplateDto } from './dto/query-document-template.dto';
import { RenderDocumentTemplateDto } from './dto/render-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';

@ApiTags('Modelos de Documento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(
    private readonly documentTemplatesService: DocumentTemplatesService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MEDICO)
  @ApiOperation({ summary: 'Criar modelo de documento ou laudo' })
  @ApiResponse({ status: 201, description: 'Modelo criado com sucesso' })
  createTemplate(@Body() dto: CreateDocumentTemplateDto) {
    return this.documentTemplatesService.createTemplate(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar modelos de documento e laudo' })
  findAll(@Query() query: QueryDocumentTemplateDto) {
    return this.documentTemplatesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Buscar modelo por ID' })
  @ApiParam({ name: 'id', description: 'ID do modelo' })
  findOne(@Param('id') id: string) {
    return this.documentTemplatesService.findOne(id);
  }

  @Post(':id/render')
  @Roles(Role.ADMIN, Role.MEDICO, Role.ENFERMEIRO, Role.ATENDENTE)
  @ApiOperation({ summary: 'Renderizar modelo com variaveis' })
  renderTemplate(
    @Param('id') id: string,
    @Body() dto: RenderDocumentTemplateDto,
  ) {
    return this.documentTemplatesService.renderTemplate(id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MEDICO)
  @ApiOperation({ summary: 'Atualizar modelo de documento ou laudo' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentTemplateDto,
  ) {
    return this.documentTemplatesService.updateTemplate(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inativar modelo' })
  deactivateTemplate(@Param('id') id: string) {
    return this.documentTemplatesService.deactivateTemplate(id);
  }
}
