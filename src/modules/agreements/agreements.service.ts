import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { CreateAgreementPricingRuleDto } from './dto/create-agreement-pricing-rule.dto';
import { QueryAgreementDto } from './dto/query-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAgreement(dto: CreateAgreementDto) {
    const name = this.normalizeName(dto.name);
    const code = this.normalizeCode(dto.code || name);

    await this.ensureAgreementUnique(name, code);

    return this.prisma.healthInsuranceProvider.create({
      data: {
        name,
        code,
        active: dto.active ?? true,
        notes: this.optionalText(dto.notes),
      },
    });
  }

  async findAll(query: QueryAgreementDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 40;
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.HealthInsuranceProviderWhereInput = {};

    if (typeof query.active === 'boolean') {
      where.active = query.active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [agreements, total] = await Promise.all([
      this.prisma.healthInsuranceProvider.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.healthInsuranceProvider.count({ where }),
    ]);

    return {
      data: agreements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const agreement = await this.prisma.healthInsuranceProvider.findUnique({
      where: { id },
    });

    if (!agreement) {
      throw new NotFoundException('Convenio nao encontrado');
    }

    return agreement;
  }

  async listPricingRules(providerId: string) {
    await this.findOne(providerId);

    return this.prisma.agreementPricingRule.findMany({
      where: { providerId },
      include: {
        pricingTable: true,
      },
      orderBy: [
        { active: 'desc' },
        { pricingTable: { type: 'asc' } },
        { pricingTable: { year: 'desc' } },
        { pricingTable: { name: 'asc' } },
      ],
    });
  }

  async createPricingRule(
    providerId: string,
    dto: CreateAgreementPricingRuleDto,
  ) {
    await this.ensureAgreementAndPricingTableExist(providerId, dto.pricingTableId);
    this.ensureValidRuleDates(dto.validFrom, dto.validTo);

    const existingRule = await this.prisma.agreementPricingRule.findUnique({
      where: {
        providerId_pricingTableId: {
          providerId,
          pricingTableId: dto.pricingTableId,
        },
      },
    });

    if (existingRule) {
      throw new ConflictException('Convenio ja possui regra para esta tabela');
    }

    return this.prisma.agreementPricingRule.create({
      data: {
        providerId,
        pricingTableId: dto.pricingTableId,
        multiplierBasisPoints: this.percentToBasisPoints(
          dto.multiplierPercent ?? 100,
        ),
        requiresAuthorization: dto.requiresAuthorization ?? false,
        active: dto.active ?? true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        notes: this.optionalText(dto.notes),
      },
      include: {
        pricingTable: true,
      },
    });
  }

  async deletePricingRule(providerId: string, ruleId: string) {
    const rule = await this.prisma.agreementPricingRule.findFirst({
      where: {
        id: ruleId,
        providerId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Regra de convenio nao encontrada');
    }

    await this.prisma.agreementPricingRule.delete({
      where: { id: ruleId },
    });

    return { message: 'Regra de convenio excluida com sucesso' };
  }

  async updateAgreement(id: string, dto: UpdateAgreementDto) {
    const current = await this.findOne(id);
    const name = dto.name ? this.normalizeName(dto.name) : current.name;
    const code = dto.code ? this.normalizeCode(dto.code) : current.code;

    await this.ensureAgreementUnique(name, code, id);

    return this.prisma.healthInsuranceProvider.update({
      where: { id },
      data: {
        name,
        code,
        active: dto.active,
        notes: dto.notes === undefined ? undefined : this.optionalText(dto.notes),
      },
    });
  }

  async deleteAgreement(id: string) {
    await this.findOne(id);

    await this.prisma.healthInsuranceProvider.delete({
      where: { id },
    });

    return { message: 'Convenio excluido com sucesso' };
  }

  private async ensureAgreementUnique(
    name: string,
    code: string,
    currentId?: string,
  ) {
    const existingAgreement = await this.prisma.healthInsuranceProvider.findFirst({
      where: {
        OR: [{ name }, { code }],
      },
    });

    if (existingAgreement && existingAgreement.id !== currentId) {
      throw new ConflictException('Convenio ja cadastrado');
    }
  }

  private async ensureAgreementAndPricingTableExist(
    providerId: string,
    pricingTableId: string,
  ) {
    const [provider, pricingTable] = await Promise.all([
      this.prisma.healthInsuranceProvider.findUnique({ where: { id: providerId } }),
      this.prisma.pricingTable.findUnique({ where: { id: pricingTableId } }),
    ]);

    if (!provider) {
      throw new NotFoundException('Convenio nao encontrado');
    }

    if (!pricingTable) {
      throw new NotFoundException('Tabela de preco nao encontrada');
    }
  }

  private ensureValidRuleDates(validFrom?: string, validTo?: string) {
    if (!validFrom || !validTo) {
      return;
    }

    if (new Date(validFrom) > new Date(validTo)) {
      throw new ConflictException('Vigencia inicial nao pode ser maior que a final');
    }
  }

  private percentToBasisPoints(value: number) {
    return Math.round(value * 100);
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  private normalizeCode(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private optionalText(value?: string) {
    return value?.trim() || undefined;
  }
}
