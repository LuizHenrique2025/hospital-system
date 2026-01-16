import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async createAppointment(dto: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Médico não encontrado');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        ...dto,
        appointmentDate: new Date(dto.appointmentDate),
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    return appointment;
  }

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada');
    }

    return appointment;
  }

  async findByPatient(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async findByDoctor(doctorId: string) {
    return this.prisma.appointment.findMany({
      where: { doctorId },
      include: { patient: true },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    await this.findOne(id);

    const updateData: any = { ...dto };

    if (dto.appointmentDate) {
      updateData.appointmentDate = new Date(dto.appointmentDate);
    }

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        doctor: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return appointment;
  }

  async deleteAppointment(id: string) {
    await this.findOne(id);

    await this.prisma.appointment.delete({
      where: { id },
    });

    return { message: 'Consulta excluída com sucesso' };
  }
}
