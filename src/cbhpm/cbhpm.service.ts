import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CbhpmProcedure, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { QueryCbhpmDto } from './dto/query-cbhpm.dto';

@Injectable()
export class CbhpmService {
  constructor(private readonly prisma: PrismaService) {}

  async summarizeImports() {
    const groupedImports = await this.prisma.cbhpmProcedure.groupBy({
      by: ['editionYear', 'sourceFile'],
      _count: { _all: true },
      _max: { importedAt: true },
      orderBy: [{ editionYear: 'asc' }],
    });

    return groupedImports.map((group) => ({
      editionYear: group.editionYear,
      sourceFile: group.sourceFile,
      total: group._count._all,
      importedAt: group._max.importedAt,
    }));
  }

  async summarizePortes(query: QueryCbhpmDto) {
    const search = query.q?.trim();
    const limit = query.limit ?? 80;
    const andWhere: Prisma.CbhpmProcedureWhereInput[] = [
      { porte: { not: null } },
      { porte: { not: '' } },
      { porte: { not: '0' } },
      { valorPorteCents: { not: null } },
    ];

    if (query.editionYear) {
      andWhere.push({ editionYear: query.editionYear });
    }

    if (search) {
      andWhere.push({
        porte: { contains: search, mode: 'insensitive' },
      });
    }

    const groupedPortes = await this.prisma.cbhpmProcedure.groupBy({
      by: ['editionYear', 'porte', 'valorPorteCents'],
      where: { AND: andWhere },
      _count: { _all: true },
      _min: {
        fracaoPorte: true,
        totalPorteCents: true,
      },
      _max: {
        fracaoPorte: true,
        totalPorteCents: true,
      },
    });

    return groupedPortes
      .sort((left, right) => {
        if (left.editionYear !== right.editionYear) {
          return right.editionYear - left.editionYear;
        }

        return this.comparePorte(left.porte ?? '', right.porte ?? '');
      })
      .slice(0, limit)
      .map((group) => ({
        editionYear: group.editionYear,
        porte: group.porte,
        valorPorteCents: group.valorPorteCents,
        valorPorte: this.centsToDecimal(group.valorPorteCents),
        procedureCount: group._count._all,
        fracaoMin: this.decimalToString(group._min.fracaoPorte),
        fracaoMax: this.decimalToString(group._max.fracaoPorte),
        totalPorteMinCents: group._min.totalPorteCents,
        totalPorteMaxCents: group._max.totalPorteCents,
        totalPorteMin: this.centsToDecimal(group._min.totalPorteCents),
        totalPorteMax: this.centsToDecimal(group._max.totalPorteCents),
      }));
  }

  async findAll(query: QueryCbhpmDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.CbhpmProcedureWhereInput = {};

    if (query.editionYear) {
      where.editionYear = query.editionYear;
    }

    if (search) {
      const searchDigits = search.replace(/\D/g, '');

      where.OR = [
        { codigo: { contains: searchDigits || search } },
        { procedimento: { contains: search, mode: 'insensitive' } },
        { porte: { contains: search, mode: 'insensitive' } },
        { sourceFile: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [procedures, total] = await Promise.all([
      this.prisma.cbhpmProcedure.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ editionYear: 'desc' }, { codigo: 'asc' }],
      }),
      this.prisma.cbhpmProcedure.count({ where }),
    ]);

    return {
      data: procedures.map((procedure) => this.toResponse(procedure)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByCodigo(codigo: string, editionYear?: number) {
    const normalizedCodigo = this.normalizeCodigo(codigo);

    if (!normalizedCodigo) {
      throw new BadRequestException('Codigo CBHPM invalido');
    }

    const cbhpmProcedure = editionYear
      ? await this.prisma.cbhpmProcedure.findUnique({
          where: {
            codigo_editionYear: {
              codigo: normalizedCodigo,
              editionYear,
            },
          },
        })
      : await this.prisma.cbhpmProcedure.findFirst({
          where: { codigo: normalizedCodigo },
          orderBy: { editionYear: 'desc' },
        });

    if (!cbhpmProcedure) {
      throw new NotFoundException('Procedimento CBHPM nao encontrado');
    }

    const availableEditions = await this.prisma.cbhpmProcedure.findMany({
      where: { codigo: normalizedCodigo },
      select: { editionYear: true },
      orderBy: { editionYear: 'asc' },
    });

    return {
      ...this.toResponse(cbhpmProcedure),
      availableEditions: availableEditions.map((item) => item.editionYear),
    };
  }

  private normalizeCodigo(codigo: string) {
    return codigo.trim().replace(/\D/g, '');
  }

  private toResponse(cbhpmProcedure: CbhpmProcedure) {
    return {
      ...cbhpmProcedure,
      fracaoPorte: this.decimalToString(cbhpmProcedure.fracaoPorte),
      filme: this.decimalToString(cbhpmProcedure.filme),
      uco: this.decimalToString(cbhpmProcedure.uco),
      valorPorte: this.centsToDecimal(cbhpmProcedure.valorPorteCents),
      totalPorte: this.centsToDecimal(cbhpmProcedure.totalPorteCents),
      totalFilme: this.centsToDecimal(cbhpmProcedure.totalFilmeCents),
      totalUco: this.centsToDecimal(cbhpmProcedure.totalUcoCents),
      valorPorteAnestesico: this.centsToDecimal(
        cbhpmProcedure.valorPorteAnestesicoCents,
      ),
      totalPorteAnestesico: this.centsToDecimal(
        cbhpmProcedure.totalPorteAnestesicoCents,
      ),
      totalAuxiliares: this.centsToDecimal(
        cbhpmProcedure.totalAuxiliaresCents,
      ),
      totalPrimeiroAuxiliar: this.centsToDecimal(
        cbhpmProcedure.totalPrimeiroAuxiliarCents,
      ),
      totalSegundoAuxiliar: this.centsToDecimal(
        cbhpmProcedure.totalSegundoAuxiliarCents,
      ),
      totalTerceiroAuxiliar: this.centsToDecimal(
        cbhpmProcedure.totalTerceiroAuxiliarCents,
      ),
      totalQuartoAuxiliar: this.centsToDecimal(
        cbhpmProcedure.totalQuartoAuxiliarCents,
      ),
      adicionais: this.centsToDecimal(cbhpmProcedure.adicionaisCents),
      subtotal: this.centsToDecimal(cbhpmProcedure.subtotalCents),
    };
  }

  private comparePorte(left: string, right: string) {
    const leftParts = this.parsePorte(left);
    const rightParts = this.parsePorte(right);

    if (leftParts.number !== rightParts.number) {
      return leftParts.number - rightParts.number;
    }

    return leftParts.suffix.localeCompare(rightParts.suffix);
  }

  private parsePorte(porte: string) {
    const match = porte.match(/^(\d+)(.*)$/);

    if (!match) {
      return { number: Number.MAX_SAFE_INTEGER, suffix: porte };
    }

    return {
      number: Number(match[1]),
      suffix: match[2],
    };
  }

  private decimalToString(value?: Prisma.Decimal | null) {
    return value ? value.toString() : null;
  }

  private centsToDecimal(value?: number | null) {
    if (typeof value !== 'number') {
      return null;
    }

    return (value / 100).toFixed(2);
  }
}
