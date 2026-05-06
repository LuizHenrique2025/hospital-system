import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAppointment(dto: CreateAppointmentDto) {
    await this.ensurePatientExists(dto.patientId);
    await this.ensureDoctorExists(dto.doctorId);

    return this.prisma.appointment.create({
      data: {
        ...dto,
        appointmentDate: this.parseAppointmentDate(dto.appointmentDate),
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(query: QueryAppointmentDto = {}) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.AppointmentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    const appointmentFrom = this.parseOptionalDate(
      query.appointmentFrom,
      'Data inicial da consulta invalida',
    );
    const appointmentTo = this.parseOptionalDate(
      query.appointmentTo,
      'Data final da consulta invalida',
      true,
    );

    if (appointmentFrom || appointmentTo) {
      where.appointmentDate = {
        gte: appointmentFrom,
        lte: appointmentTo,
      };
    }

    if (search) {
      const searchDigits = search.replace(/\D/g, '');
      const searchByDigits = searchDigits.length > 0 ? searchDigits : search;

      where.OR = [
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { cpf: { contains: searchByDigits } } },
        {
          doctor: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          doctor: {
            crm: { contains: search, mode: 'insensitive' },
          },
        },
        {
          doctor: {
            sector: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        { notes: { contains: search, mode: 'insensitive' } },
        { diagnosis: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: this.defaultInclude(),
        orderBy: { appointmentDate: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!appointment) {
      throw new NotFoundException('Consulta nao encontrada');
    }

    return appointment;
  }

  async findByPatient(patientId: string) {
    await this.ensurePatientExists(patientId);

    return this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
            sector: {
              select: { id: true, name: true, code: true, active: true },
            },
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async findByDoctor(doctorId: string) {
    await this.ensureDoctorExists(doctorId);

    return this.prisma.appointment.findMany({
      where: { doctorId },
      include: { patient: true },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    await this.findOne(id);

    if (dto.patientId) {
      await this.ensurePatientExists(dto.patientId);
    }

    if (dto.doctorId) {
      await this.ensureDoctorExists(dto.doctorId);
    }

    const { appointmentDate, ...data } = dto;
    const updateData: Prisma.AppointmentUncheckedUpdateInput = { ...data };

    if (appointmentDate) {
      updateData.appointmentDate = this.parseAppointmentDate(appointmentDate);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: this.defaultInclude(),
    });
  }

  async deleteAppointment(id: string) {
    await this.findOne(id);

    await this.prisma.appointment.delete({
      where: { id },
    });

    return { message: 'Consulta excluida com sucesso' };
  }

  private async ensurePatientExists(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente nao encontrado');
    }
  }

  private async ensureDoctorExists(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Medico nao encontrado');
    }
  }

  private parseAppointmentDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Data da consulta invalida');
    }

    return parsedDate;
  }

  private parseOptionalDate(
    value: string | undefined,
    errorMessage: string,
    endOfDay = false,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    if (endOfDay) {
      parsedDate.setHours(23, 59, 59, 999);
    }

    return parsedDate;
  }

  private defaultInclude(): Prisma.AppointmentInclude {
    return {
      patient: true,
      doctor: {
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true },
          },
          sector: {
            select: { id: true, name: true, code: true, active: true },
          },
        },
      },
    };
  }
}
