import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingTableType, Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCbhpmRangeDto } from './dto/create-cbhpm-range.dto';
import { CreatePricingTableDto } from './dto/create-pricing-table.dto';
import { CreateProcedurePriceDto } from './dto/create-procedure-price.dto';
import { QueryPricingTableDto } from './dto/query-pricing-table.dto';
import { QueryProcedurePriceDto } from './dto/query-procedure-price.dto';
import { UpdatePricingTableDto } from './dto/update-pricing-table.dto';
import { UpdateProcedurePriceDto } from './dto/update-procedure-price.dto';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async createPricingTable(dto: CreatePricingTableDto) {
    await this.ensurePricingTableUnique(dto.name, dto.year);

    return this.prisma.pricingTable.create({
      data: this.normalizePricingTableCreateData(dto),
      include: this.pricingTableInclude(),
    });
  }

  async createCbhpmRange(dto: CreateCbhpmRangeDto) {
    const startYear = dto.startYear ?? 2004;
    const endYear = dto.endYear ?? 2017;

    if (startYear > endYear) {
      throw new BadRequestException('Ano inicial nao pode ser maior que o final');
    }

    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, index) => startYear + index,
    );

    return Promise.all(
      years.map((year) =>
        this.prisma.pricingTable.upsert({
          where: {
            name_year: {
              name: `CBHPM ${year}`,
              year,
            },
          },
          create: {
            name: `CBHPM ${year}`,
            type: PricingTableType.CBHPM,
            year,
            code: `CBHPM-${year}`,
            description: `Tabela CBHPM ${year}`,
            active: true,
          },
          update: {
            type: PricingTableType.CBHPM,
            code: `CBHPM-${year}`,
            active: true,
          },
          include: this.pricingTableInclude(),
        }),
      ),
    );
  }

  async findPricingTables(query: QueryPricingTableDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.PricingTableWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.year) {
      where.year = query.year;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [pricingTables, total] = await Promise.all([
      this.prisma.pricingTable.findMany({
        where,
        skip,
        take: limit,
        include: this.pricingTableInclude(),
        orderBy: [{ type: 'asc' }, { year: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.pricingTable.count({ where }),
    ]);

    return {
      data: pricingTables,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPricingTable(id: string) {
    const pricingTable = await this.prisma.pricingTable.findUnique({
      where: { id },
      include: this.pricingTableInclude(),
    });

    if (!pricingTable) {
      throw new NotFoundException('Tabela de preco nao encontrada');
    }

    return pricingTable;
  }

  async updatePricingTable(id: string, dto: UpdatePricingTableDto) {
    const current = await this.findPricingTable(id);

    if (dto.name || dto.year !== undefined) {
      await this.ensurePricingTableUnique(
        dto.name ?? current.name,
        dto.year ?? current.year,
        id,
      );
    }

    return this.prisma.pricingTable.update({
      where: { id },
      data: this.normalizePricingTableUpdateData(dto),
      include: this.pricingTableInclude(),
    });
  }

  async deletePricingTable(id: string) {
    await this.findPricingTable(id);

    await this.prisma.pricingTable.delete({
      where: { id },
    });

    return { message: 'Tabela de preco excluida com sucesso' };
  }

  async createProcedurePrice(dto: CreateProcedurePriceDto) {
    await this.ensureProcedureAndTableExist(dto.procedureId, dto.pricingTableId);

    const existingPrice = await this.prisma.procedurePrice.findUnique({
      where: {
        procedureId_pricingTableId: {
          procedureId: dto.procedureId,
          pricingTableId: dto.pricingTableId,
        },
      },
    });

    if (existingPrice) {
      throw new ConflictException(
        'Este procedimento ja possui valor para a tabela selecionada',
      );
    }

    return this.prisma.procedurePrice.create({
      data: this.normalizeProcedurePriceCreateData(dto),
      include: this.procedurePriceInclude(),
    });
  }

  async findProcedurePrices(query: QueryProcedurePriceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.ProcedurePriceWhereInput = {};

    if (query.procedureId) {
      where.procedureId = query.procedureId;
    }

    if (query.pricingTableId) {
      where.pricingTableId = query.pricingTableId;
    }

    if (search) {
      where.OR = [
        { procedure: { code: { contains: search, mode: 'insensitive' } } },
        {
          procedure: {
            description: { contains: search, mode: 'insensitive' },
          },
        },
        { pricingTable: { name: { contains: search, mode: 'insensitive' } } },
        { billingUnit: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [prices, total] = await Promise.all([
      this.prisma.procedurePrice.findMany({
        where,
        skip,
        take: limit,
        include: this.procedurePriceInclude(),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.procedurePrice.count({ where }),
    ]);

    return {
      data: prices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateProcedurePrice(id: string, dto: UpdateProcedurePriceDto) {
    const current = await this.prisma.procedurePrice.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Valor de procedimento nao encontrado');
    }

    await this.ensureProcedureAndTableExist(
      dto.procedureId ?? current.procedureId,
      dto.pricingTableId ?? current.pricingTableId,
    );

    return this.prisma.procedurePrice.update({
      where: { id },
      data: this.normalizeProcedurePriceUpdateData(dto),
      include: this.procedurePriceInclude(),
    });
  }

  async deleteProcedurePrice(id: string) {
    const current = await this.prisma.procedurePrice.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Valor de procedimento nao encontrado');
    }

    await this.prisma.procedurePrice.delete({
      where: { id },
    });

    return { message: 'Valor de procedimento excluido com sucesso' };
  }

  private async ensurePricingTableUnique(
    name: string,
    year?: number | null,
    currentId?: string,
  ) {
    const existingTable = await this.prisma.pricingTable.findFirst({
      where: { name: name.trim(), year },
    });

    if (existingTable && existingTable.id !== currentId) {
      throw new ConflictException('Tabela de preco ja cadastrada');
    }
  }

  private async ensureProcedureAndTableExist(
    procedureId: string,
    pricingTableId: string,
  ) {
    const [procedure, pricingTable] = await Promise.all([
      this.prisma.procedure.findUnique({ where: { id: procedureId } }),
      this.prisma.pricingTable.findUnique({ where: { id: pricingTableId } }),
    ]);

    if (!procedure) {
      throw new NotFoundException('Procedimento nao encontrado');
    }

    if (!pricingTable) {
      throw new NotFoundException('Tabela de preco nao encontrada');
    }
  }

  private normalizePricingTableCreateData(
    dto: CreatePricingTableDto,
  ): Prisma.PricingTableUncheckedCreateInput {
    return {
      name: dto.name.trim(),
      type: dto.type,
      year: dto.year,
      code: this.optionalText(dto.code),
      description: this.optionalText(dto.description),
      active: dto.active,
    };
  }

  private normalizePricingTableUpdateData(
    dto: UpdatePricingTableDto,
  ): Prisma.PricingTableUncheckedUpdateInput {
    return {
      name: dto.name?.trim(),
      type: dto.type,
      year: dto.year,
      code: this.optionalText(dto.code),
      description: this.optionalText(dto.description),
      active: dto.active,
    };
  }

  private normalizeProcedurePriceCreateData(
    dto: CreateProcedurePriceDto,
  ): Prisma.ProcedurePriceUncheckedCreateInput {
    return {
      procedureId: dto.procedureId,
      pricingTableId: dto.pricingTableId,
      priceCents: dto.priceCents,
      operationalCostCents: dto.operationalCostCents,
      billingUnit: this.optionalText(dto.billingUnit),
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      active: dto.active,
      notes: this.optionalText(dto.notes),
    };
  }

  private normalizeProcedurePriceUpdateData(
    dto: UpdateProcedurePriceDto,
  ): Prisma.ProcedurePriceUncheckedUpdateInput {
    return {
      procedureId: dto.procedureId,
      pricingTableId: dto.pricingTableId,
      priceCents: dto.priceCents,
      operationalCostCents: dto.operationalCostCents,
      billingUnit: this.optionalText(dto.billingUnit),
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      active: dto.active,
      notes: this.optionalText(dto.notes),
    };
  }

  private pricingTableInclude(): Prisma.PricingTableInclude {
    return {
      _count: {
        select: { prices: true },
      },
    };
  }

  private procedurePriceInclude(): Prisma.ProcedurePriceInclude {
    return {
      procedure: true,
      pricingTable: true,
    };
  }

  private optionalText(value?: string) {
    return value?.trim() || undefined;
  }
}
