import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PatientStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  private readonly patientListSelect = {
    id: true,
    name: true,
    cpf: true,
    rg: true,
    birthDate: true,
    gender: true,
    bloodType: true,
    phone: true,
    email: true,
    address: true,
    city: true,
    state: true,
    zipCode: true,
    emergencyContact: true,
    emergencyPhone: true,
    status: true,
    blockReason: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.PatientSelect;

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
    const {
      page = 1,
      limit = 10,
      name,
      q,
      cpf,
      gender,
      bloodType,
      status,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      status: status ?? { not: PatientStatus.INACTIVE },
    };
    const search = q?.trim();

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (search) {
      const searchDigits = search.replace(/\D/g, '');
      const searchByDigits = searchDigits.length > 0 ? searchDigits : search;

      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: searchByDigits } },
        { rg: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
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
        select: this.patientListSelect,
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
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        status: { not: PatientStatus.INACTIVE },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    return patient;
  }

  async findByCpf(cpf: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        cpf,
        status: { not: PatientStatus.INACTIVE },
      },
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

    if (dto.status && dto.status !== PatientStatus.BLOCKED) {
      updateData.blockReason = null;
    }

    const patient = await this.prisma.patient.update({
      where: { id },
      data: updateData,
    });

    return patient;
  }

  async deletePatient(id: string) {
    await this.findOne(id);

    await this.prisma.patient.update({
      where: { id },
      data: {
        status: PatientStatus.INACTIVE,
        blockReason: 'Cadastro inativado por exclusao administrativa',
      },
    });

    return { message: 'Paciente inativado com sucesso' };
  }
}
