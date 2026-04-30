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
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { CreateAgreementPricingRuleDto } from './dto/create-agreement-pricing-rule.dto';
import { QueryAgreementDto } from './dto/query-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';

@ApiTags('Convênios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Criar convenio' })
  @ApiResponse({ status: 201, description: 'Convenio criado com sucesso' })
  createAgreement(@Body() dto: CreateAgreementDto) {
    return this.agreementsService.createAgreement(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Buscar convenios cadastrados' })
  findAll(@Query() query: QueryAgreementDto) {
    return this.agreementsService.findAll(query);
  }

  @Get(':id/pricing-rules')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Listar regras de tabela por convenio' })
  @ApiParam({ name: 'id', description: 'ID do convenio' })
  listPricingRules(@Param('id') id: string) {
    return this.agreementsService.listPricingRules(id);
  }

  @Post(':id/pricing-rules')
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Vincular convenio a tabela de preco' })
  @ApiParam({ name: 'id', description: 'ID do convenio' })
  createPricingRule(
    @Param('id') id: string,
    @Body() dto: CreateAgreementPricingRuleDto,
  ) {
    return this.agreementsService.createPricingRule(id, dto);
  }

  @Delete(':id/pricing-rules/:ruleId')
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir regra de tabela do convenio' })
  deletePricingRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.agreementsService.deletePricingRule(id, ruleId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Buscar convenio por ID' })
  @ApiParam({ name: 'id', description: 'ID do convenio' })
  findOne(@Param('id') id: string) {
    return this.agreementsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FATURAMENTO)
  @ApiOperation({ summary: 'Atualizar convenio' })
  updateAgreement(@Param('id') id: string, @Body() dto: UpdateAgreementDto) {
    return this.agreementsService.updateAgreement(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir convenio' })
  deleteAgreement(@Param('id') id: string) {
    return this.agreementsService.deleteAgreement(id);
  }
}
