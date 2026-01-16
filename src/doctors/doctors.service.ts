import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== Role.MEDICO) {
      throw new BadRequestException('Usuário deve ter role MEDICO');
    }

    const existingDoctor = await this.prisma.doctor.findUnique({
      where: { userId: dto.userId },
    });

    if (existingDoctor) {
      throw new ConflictException('Usuário já possui perfil de médico');
    }

    const existingCrm = await this.prisma.doctor.findUnique({
      where: { crm: dto.crm },
    });

    if (existingCrm) {
      throw new ConflictException('CRM já cadastrado');
    }

    const doctor = await this.prisma.doctor.create({
      data: dto,
      include: { user: true },
    });

    return doctor;
  }

  async findAll() {
    return this.prisma.doctor.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!doctor) {
      throw new NotFoundException('Médico não encontrado');
    }

    return doctor;
  }

  async findByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!doctor) {
      throw new NotFoundException('Médico não encontrado');
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
        throw new ConflictException('CRM já está em uso');
      }
    }

    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return doctor;
  }

  async deleteDoctor(id: string) {
    await this.findOne(id);

    await this.prisma.doctor.delete({
      where: { id },
    });

    return { message: 'Médico excluído com sucesso' };
  }
}
