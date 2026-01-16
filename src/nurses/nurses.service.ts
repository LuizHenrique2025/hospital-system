import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== Role.ENFERMEIRO) {
      throw new BadRequestException('Usuário deve ter role ENFERMEIRO');
    }

    const existingNurse = await this.prisma.nurse.findUnique({
      where: { userId: dto.userId },
    });

    if (existingNurse) {
      throw new ConflictException('Usuário já possui perfil de enfermeiro');
    }

    const existingCoren = await this.prisma.nurse.findUnique({
      where: { coren: dto.coren },
    });

    if (existingCoren) {
      throw new ConflictException('COREN já cadastrado');
    }

    const nurse = await this.prisma.nurse.create({
      data: dto,
      include: { user: true },
    });

    return nurse;
  }

  async findAll() {
    return this.prisma.nurse.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const nurse = await this.prisma.nurse.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!nurse) {
      throw new NotFoundException('Enfermeiro não encontrado');
    }

    return nurse;
  }

  async findByUserId(userId: string) {
    const nurse = await this.prisma.nurse.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!nurse) {
      throw new NotFoundException('Enfermeiro não encontrado');
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
        throw new ConflictException('COREN já está em uso');
      }
    }

    const nurse = await this.prisma.nurse.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return nurse;
  }

  async deleteNurse(id: string) {
    await this.findOne(id);

    await this.prisma.nurse.delete({
      where: { id },
    });

    return { message: 'Enfermeiro excluído com sucesso' };
  }
}
