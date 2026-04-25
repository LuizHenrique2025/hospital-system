import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

@Injectable()
export class SectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSector(dto: CreateSectorDto) {
    await this.ensureUnique(dto.name, dto.code);

    return this.prisma.sector.create({
      data: {
        ...dto,
        active: dto.active ?? true,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll() {
    return this.prisma.sector.findMany({
      include: this.defaultInclude(),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado');
    }

    return sector;
  }

  async updateSector(id: string, dto: UpdateSectorDto) {
    await this.findOne(id);

    if (dto.name || dto.code) {
      await this.ensureUnique(dto.name, dto.code, id);
    }

    return this.prisma.sector.update({
      where: { id },
      data: dto,
      include: this.defaultInclude(),
    });
  }

  async deleteSector(id: string) {
    await this.findOne(id);

    await this.prisma.sector.delete({
      where: { id },
    });

    return { message: 'Setor excluido com sucesso' };
  }

  private async ensureUnique(name?: string, code?: string, currentId?: string) {
    if (name) {
      const existingByName = await this.prisma.sector.findUnique({
        where: { name },
      });

      if (existingByName && existingByName.id !== currentId) {
        throw new ConflictException('Nome do setor ja cadastrado');
      }
    }

    if (code) {
      const existingByCode = await this.prisma.sector.findUnique({
        where: { code },
      });

      if (existingByCode && existingByCode.id !== currentId) {
        throw new ConflictException('Codigo do setor ja cadastrado');
      }
    }
  }

  private defaultInclude() {
    return {
      doctors: {
        select: {
          id: true,
          crm: true,
          crmUf: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      nurses: {
        select: {
          id: true,
          coren: true,
          corenUf: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    };
  }
}
