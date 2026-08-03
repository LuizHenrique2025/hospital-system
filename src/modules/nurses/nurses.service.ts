import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateNurseDto } from './dto/create-nurse.dto';
import { UpdateNurseDto } from './dto/update-nurse.dto';
import { Role } from '@prisma/client';

@Injectable()
export class NursesService {
  constructor(private prisma: PrismaService) {}

  async createNurse(dto: CreateNurseDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    if (user.role !== Role.ENFERMEIRO) {
      throw new BadRequestException('Usuario deve ter role ENFERMEIRO');
    }

    const existingNurse = await this.prisma.nurse.findUnique({
      where: { userId: dto.userId },
    });

    if (existingNurse) {
      throw new ConflictException('Usuario ja possui perfil de enfermeiro');
    }

    const existingCoren = await this.prisma.nurse.findUnique({
      where: { coren: dto.coren },
    });

    if (existingCoren) {
      throw new ConflictException('COREN ja cadastrado');
    }

    if (dto.sectorId) {
      await this.ensureSectorExists(dto.sectorId);
    }

    return this.prisma.nurse.create({
      data: {
        ...dto,
        documents: dto.documents ?? [],
        active: true,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll() {
    return this.prisma.nurse.findMany({
      where: { active: true },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const nurse = await this.prisma.nurse.findFirst({
      where: { id, active: true },
      include: this.defaultInclude(),
    });

    if (!nurse) {
      throw new NotFoundException('Enfermeiro nao encontrado');
    }

    return nurse;
  }

  async findByUserId(userId: string) {
    const nurse = await this.prisma.nurse.findFirst({
      where: { userId, active: true },
      include: this.defaultInclude(),
    });

    if (!nurse) {
      throw new NotFoundException('Enfermeiro nao encontrado');
    }

    return nurse;
  }

  async updateNurse(id: string, dto: UpdateNurseDto) {
    await this.findOne(id);

    if (dto.coren) {
      const existingCoren = await this.prisma.nurse.findUnique({
        where: { coren: dto.coren },
      });

      if (existingCoren && existingCoren.id !== id) {
        throw new ConflictException('COREN ja esta em uso');
      }
    }

    if (dto.sectorId) {
      await this.ensureSectorExists(dto.sectorId);
    }

    return this.prisma.nurse.update({
      where: { id },
      data: dto,
      include: this.defaultInclude(),
    });
  }

  async deleteNurse(id: string) {
    await this.findOne(id);

    await this.prisma.nurse.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Enfermeiro inativado com sucesso' };
  }

  private async ensureSectorExists(sectorId: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id: sectorId },
    });

    if (!sector) {
      throw new NotFoundException('Setor nao encontrado');
    }
  }

  private defaultInclude() {
    return {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          active: true,
        },
      },
      sector: {
        select: {
          id: true,
          name: true,
          code: true,
          active: true,
        },
      },
    };
  }
}
