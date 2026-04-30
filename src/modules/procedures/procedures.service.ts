import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { QueryProcedureDto } from './dto/query-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  async createProcedure(dto: CreateProcedureDto) {
    const code = this.normalizeCode(dto.code);
    const existingProcedure = await this.prisma.procedure.findUnique({
      where: { code },
    });

    if (existingProcedure) {
      throw new ConflictException('Codigo de procedimento ja cadastrado');
    }

    return this.prisma.procedure.create({
      data: this.normalizeProcedureCreateData(dto, code),
    });
  }

  async findAll(query: QueryProcedureDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.ProcedureWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tableCode: { contains: search, mode: 'insensitive' } },
        { groupName: { contains: search, mode: 'insensitive' } },
        { unit: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [procedures, total] = await Promise.all([
      this.prisma.procedure.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ active: 'desc' }, { description: 'asc' }],
      }),
      this.prisma.procedure.count({ where }),
    ]);

    return {
      data: procedures,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id },
    });

    if (!procedure) {
      throw new NotFoundException('Procedimento nao encontrado');
    }

    return procedure;
  }

  async updateProcedure(id: string, dto: UpdateProcedureDto) {
    await this.findOne(id);

    const code = dto.code ? this.normalizeCode(dto.code) : undefined;

    if (code) {
      const existingProcedure = await this.prisma.procedure.findUnique({
        where: { code },
      });

      if (existingProcedure && existingProcedure.id !== id) {
        throw new ConflictException('Codigo de procedimento ja cadastrado');
      }
    }

    return this.prisma.procedure.update({
      where: { id },
      data: this.normalizeProcedureUpdateData(dto, code),
    });
  }

  async deleteProcedure(id: string) {
    await this.findOne(id);

    await this.prisma.procedure.delete({
      where: { id },
    });

    return { message: 'Procedimento excluido com sucesso' };
  }

  private normalizeProcedureCreateData(
    dto: CreateProcedureDto,
    normalizedCode: string,
  ): Prisma.ProcedureUncheckedCreateInput {
    return {
      code: normalizedCode,
      description: this.normalizeDescription(dto.description),
      type: dto.type,
      tableCode: this.optionalText(dto.tableCode),
      groupName: this.optionalText(dto.groupName),
      unit: this.optionalText(dto.unit),
      referencePriceCents: dto.referencePriceCents,
      requiresAuthorization: dto.requiresAuthorization,
      requiresReport: dto.requiresReport,
      billable: dto.billable,
      active: dto.active,
      notes: this.optionalText(dto.notes),
    };
  }

  private normalizeProcedureUpdateData(
    dto: UpdateProcedureDto,
    normalizedCode?: string,
  ): Prisma.ProcedureUncheckedUpdateInput {
    return {
      code: normalizedCode,
      description: dto.description
        ? this.normalizeDescription(dto.description)
        : undefined,
      tableCode: this.optionalText(dto.tableCode),
      groupName: this.optionalText(dto.groupName),
      unit: this.optionalText(dto.unit),
      type: dto.type,
      referencePriceCents: dto.referencePriceCents,
      requiresAuthorization: dto.requiresAuthorization,
      requiresReport: dto.requiresReport,
      billable: dto.billable,
      active: dto.active,
      notes: this.optionalText(dto.notes),
    };
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase();
  }

  private normalizeDescription(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private optionalText(value?: string) {
    return value?.trim() || undefined;
  }
}
