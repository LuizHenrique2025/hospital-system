import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Role } from '@prisma/client';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async createDoctor(dto: CreateDoctorDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    if (user.role !== Role.MEDICO) {
      throw new BadRequestException('Usuario deve ter role MEDICO');
    }

    const existingDoctor = await this.prisma.doctor.findUnique({
      where: { userId: dto.userId },
    });

    if (existingDoctor) {
      throw new ConflictException('Usuario ja possui perfil de medico');
    }

    const existingCrm = await this.prisma.doctor.findUnique({
      where: { crm: dto.crm },
    });

    if (existingCrm) {
      throw new ConflictException('CRM ja cadastrado');
    }

    if (dto.sectorId) {
      await this.ensureSectorExists(dto.sectorId);
    }

    return this.prisma.doctor.create({
      data: {
        ...dto,
        documents: dto.documents ?? [],
      },
      include: this.defaultInclude(),
    });
  }

  async findAll() {
    return this.prisma.doctor.findMany({
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!doctor) {
      throw new NotFoundException('Medico nao encontrado');
    }

    return doctor;
  }

  async findByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: this.defaultInclude(),
    });

    if (!doctor) {
      throw new NotFoundException('Medico nao encontrado');
    }

    return doctor;
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto) {
    await this.findOne(id);

    if (dto.crm) {
      const existingCrm = await this.prisma.doctor.findUnique({
        where: { crm: dto.crm },
      });

      if (existingCrm && existingCrm.id !== id) {
        throw new ConflictException('CRM ja esta em uso');
      }
    }

    if (dto.sectorId) {
      await this.ensureSectorExists(dto.sectorId);
    }

    return this.prisma.doctor.update({
      where: { id },
      data: dto,
      include: this.defaultInclude(),
    });
  }

  async deleteDoctor(id: string) {
    await this.findOne(id);

    await this.prisma.doctor.delete({
      where: { id },
    });

    return { message: 'Medico excluido com sucesso' };
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
