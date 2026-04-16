import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async createPatient(dto: CreatePatientDto) {
    const existingPatient = await this.prisma.patient.findUnique({
      where: { cpf: dto.cpf },
    });

    if (existingPatient) {
      throw new ConflictException('CPF já está cadastrado');
    }

    const patient = await this.prisma.patient.create({
      data: {
        ...dto,
        birthDate: new Date(dto.birthDate),
      },
    });

    return patient;
  }

  async findAll(query: QueryPatientDto) {
    const { page = 1, limit = 10, name, cpf, gender, bloodType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {};

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (cpf) {
      where.cpf = cpf;
    }

    if (gender) {
      where.gender = gender;
    }

    if (bloodType) {
      where.bloodType = bloodType;
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data: patients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    return patient;
  }

  async findByCpf(cpf: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { cpf },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    return patient;
  }

  async updatePatient(id: string, dto: UpdatePatientDto) {
    await this.findOne(id);

    if (dto.cpf) {
      const existingPatient = await this.prisma.patient.findUnique({
        where: { cpf: dto.cpf },
      });

      if (existingPatient && existingPatient.id !== id) {
        throw new ConflictException('CPF já está em uso por outro paciente');
      }
    }

    const { birthDate, ...data } = dto;
    const updateData: Prisma.PatientUpdateInput = { ...data };

    if (birthDate) {
      updateData.birthDate = new Date(birthDate);
    }

    const patient = await this.prisma.patient.update({
      where: { id },
      data: updateData,
    });

    return patient;
  }

  async deletePatient(id: string) {
    await this.findOne(id);

    await this.prisma.patient.delete({
      where: { id },
    });

    return { message: 'Paciente excluído com sucesso' };
  }
}
