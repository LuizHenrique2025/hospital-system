import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CreateExamOrderDto,
  CreateExamOrderItemDto,
} from './dto/create-exam-order.dto';
import { QueryExamOrderDto } from './dto/query-exam-order.dto';
import { UpdateExamOrderDto } from './dto/update-exam-order.dto';

@Injectable()
export class ExamOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createExamOrder(dto: CreateExamOrderDto) {
    await this.validateReferences(dto);

    return this.prisma.examOrder.create({
      data: {
        patientId: dto.patientId,
        requesterDoctorId: dto.requesterDoctorId,
        appointmentId: dto.appointmentId,
        status: dto.status,
        priority: this.optionalText(dto.priority),
        clinicalIndication: this.optionalText(dto.clinicalIndication),
        notes: this.optionalText(dto.notes),
        items: {
          create: this.normalizeItems(dto.items),
        },
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(query: QueryExamOrderDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.ExamOrderWhereInput = query.status
      ? {}
      : { status: { not: 'CANCELED' } };

    if (query.status) {
      where.status = query.status;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.requesterDoctorId) {
      where.requesterDoctorId = query.requesterDoctorId;
    }

    if (search) {
      const searchDigits = search.replace(/\D/g, '');
      const searchByDigits = searchDigits.length > 0 ? searchDigits : search;

      where.OR = [
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { cpf: { contains: searchByDigits } } },
        {
          requesterDoctor: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          items: {
            some: {
              procedure: {
                OR: [
                  { code: { contains: search, mode: 'insensitive' } },
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        },
        { priority: { contains: search, mode: 'insensitive' } },
        { clinicalIndication: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [examOrders, total] = await Promise.all([
      this.prisma.examOrder.findMany({
        where,
        skip,
        take: limit,
        include: this.defaultInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.examOrder.count({ where }),
    ]);

    return {
      data: examOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const examOrder = await this.prisma.examOrder.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!examOrder) {
      throw new NotFoundException('Pedido de exames nao encontrado');
    }

    return examOrder;
  }

  async updateExamOrder(id: string, dto: UpdateExamOrderDto) {
    await this.findOne(id);
    await this.validateReferences(dto);

    const { items, ...data } = dto;

    if (items) {
      return this.prisma.$transaction(async (transaction) => {
        await transaction.examOrderItem.deleteMany({
          where: { examOrderId: id },
        });

        return transaction.examOrder.update({
          where: { id },
          data: {
            ...this.normalizeOrderData(data),
            items: {
              create: this.normalizeItems(items),
            },
          },
          include: this.defaultInclude(),
        });
      });
    }

    return this.prisma.examOrder.update({
      where: { id },
      data: this.normalizeOrderData(data),
      include: this.defaultInclude(),
    });
  }

  async deleteExamOrder(id: string) {
    await this.findOne(id);

    await this.prisma.examOrder.update({
      where: { id },
      data: {
        status: 'CANCELED',
        notes: 'Pedido cancelado por exclusao administrativa',
      },
    });

    return { message: 'Pedido de exames cancelado com sucesso' };
  }

  private async validateReferences(
    dto: Partial<CreateExamOrderDto> | Partial<UpdateExamOrderDto>,
  ) {
    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });

      if (!patient) {
        throw new NotFoundException('Paciente nao encontrado');
      }
    }

    if (dto.requesterDoctorId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: dto.requesterDoctorId },
      });

      if (!doctor) {
        throw new NotFoundException('Medico solicitante nao encontrado');
      }
    }

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });

      if (!appointment) {
        throw new NotFoundException('Atendimento nao encontrado');
      }
    }

    if (dto.items) {
      const procedureIds = [
        ...new Set(dto.items.map((item) => item.procedureId)),
      ];

      if (procedureIds.length !== dto.items.length) {
        throw new BadRequestException(
          'O pedido possui procedimentos duplicados',
        );
      }

      const procedures = await this.prisma.procedure.findMany({
        where: { id: { in: procedureIds }, active: true },
        select: { id: true },
      });

      if (procedures.length !== procedureIds.length) {
        throw new NotFoundException(
          'Um ou mais procedimentos ativos nao foram encontrados',
        );
      }
    }
  }

  private normalizeOrderData(
    dto: Omit<UpdateExamOrderDto, 'items'>,
  ): Prisma.ExamOrderUncheckedUpdateInput {
    return {
      patientId: dto.patientId,
      requesterDoctorId: dto.requesterDoctorId,
      appointmentId: dto.appointmentId,
      status: dto.status,
      priority: this.optionalText(dto.priority),
      clinicalIndication: this.optionalText(dto.clinicalIndication),
      notes: this.optionalText(dto.notes),
    };
  }

  private normalizeItems(items: CreateExamOrderItemDto[]) {
    return items.map((item) => ({
      procedureId: item.procedureId,
      quantity: item.quantity ?? 1,
      notes: this.optionalText(item.notes),
    }));
  }

  private defaultInclude(): Prisma.ExamOrderInclude {
    return {
      patient: true,
      requesterDoctor: {
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true },
          },
          sector: {
            select: { id: true, name: true, code: true, active: true },
          },
        },
      },
      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          status: true,
          type: true,
        },
      },
      items: {
        include: {
          procedure: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    };
  }

  private optionalText(value?: string) {
    return value?.trim() || undefined;
  }
}
