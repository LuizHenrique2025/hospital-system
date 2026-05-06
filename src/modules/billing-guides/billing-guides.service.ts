import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingGuideMovementType,
  BillingGuideStatus,
  Prisma,
} from '@prisma/client';
import { randomInt } from 'node:crypto';

import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CreateBillingGuideDto,
  CreateBillingGuideItemDto,
} from './dto/create-billing-guide.dto';
import { MoveBillingGuideDto } from './dto/move-billing-guide.dto';
import { QueryBillingGuideDto } from './dto/query-billing-guide.dto';

const allowedTransitions: Record<BillingGuideStatus, BillingGuideStatus[]> = {
  OPEN: [
    BillingGuideStatus.AUTHORIZATION_PENDING,
    BillingGuideStatus.AUTHORIZED,
    BillingGuideStatus.ACCOUNT_REVIEW,
    BillingGuideStatus.CANCELED,
  ],
  AUTHORIZATION_PENDING: [
    BillingGuideStatus.AUTHORIZED,
    BillingGuideStatus.PARTIALLY_AUTHORIZED,
    BillingGuideStatus.DENIED,
    BillingGuideStatus.PENDING_DOCUMENTATION,
    BillingGuideStatus.CANCELED,
  ],
  AUTHORIZED: [
    BillingGuideStatus.IN_EXECUTION,
    BillingGuideStatus.EXECUTED,
    BillingGuideStatus.ACCOUNT_REVIEW,
    BillingGuideStatus.CANCELED,
  ],
  PARTIALLY_AUTHORIZED: [
    BillingGuideStatus.IN_EXECUTION,
    BillingGuideStatus.ACCOUNT_REVIEW,
    BillingGuideStatus.DENIED,
  ],
  DENIED: [
    BillingGuideStatus.APPEAL_IN_PROGRESS,
    BillingGuideStatus.LOSS_ACCEPTED,
    BillingGuideStatus.CANCELED,
  ],
  IN_EXECUTION: [
    BillingGuideStatus.EXECUTED,
    BillingGuideStatus.ACCOUNT_REVIEW,
    BillingGuideStatus.CANCELED,
  ],
  EXECUTED: [
    BillingGuideStatus.ACCOUNT_REVIEW,
    BillingGuideStatus.SENT_TO_PROVIDER,
  ],
  ACCOUNT_REVIEW: [
    BillingGuideStatus.SENT_TO_PROVIDER,
    BillingGuideStatus.PENDING_DOCUMENTATION,
    BillingGuideStatus.GLOSA,
    BillingGuideStatus.CLOSED,
  ],
  SENT_TO_PROVIDER: [
    BillingGuideStatus.PAID,
    BillingGuideStatus.PARTIALLY_PAID,
    BillingGuideStatus.GLOSA,
    BillingGuideStatus.PENDING_DOCUMENTATION,
    BillingGuideStatus.REJECTED,
  ],
  PAID: [BillingGuideStatus.CLOSED],
  PARTIALLY_PAID: [
    BillingGuideStatus.GLOSA,
    BillingGuideStatus.APPEAL_IN_PROGRESS,
    BillingGuideStatus.CLOSED,
  ],
  GLOSA: [
    BillingGuideStatus.APPEAL_IN_PROGRESS,
    BillingGuideStatus.LOSS_ACCEPTED,
    BillingGuideStatus.CLOSED,
  ],
  PENDING_DOCUMENTATION: [
    BillingGuideStatus.ACCOUNT_REVIEW,
    BillingGuideStatus.SENT_TO_PROVIDER,
    BillingGuideStatus.REJECTED,
  ],
  REJECTED: [BillingGuideStatus.ACCOUNT_REVIEW, BillingGuideStatus.CANCELED],
  APPEAL_IN_PROGRESS: [
    BillingGuideStatus.APPEAL_ACCEPTED,
    BillingGuideStatus.APPEAL_DENIED,
    BillingGuideStatus.PENDING_DOCUMENTATION,
  ],
  APPEAL_ACCEPTED: [
    BillingGuideStatus.PARTIALLY_PAID,
    BillingGuideStatus.PAID,
    BillingGuideStatus.CLOSED,
  ],
  APPEAL_DENIED: [BillingGuideStatus.LOSS_ACCEPTED, BillingGuideStatus.CLOSED],
  LOSS_ACCEPTED: [BillingGuideStatus.CLOSED],
  CLOSED: [],
  CANCELED: [],
};

@Injectable()
export class BillingGuidesService {
  constructor(private readonly prisma: PrismaService) {}

  async createBillingGuide(dto: CreateBillingGuideDto, userId?: string) {
    await this.validateReferences(dto);

    const guideNumber = dto.guideNumber
      ? this.normalizeGuideNumber(dto.guideNumber)
      : await this.generateGuideNumber();

    await this.ensureGuideNumberAvailable(guideNumber);

    const initialStatus = dto.currentStatus ?? BillingGuideStatus.OPEN;
    const requestedAmountCents =
      dto.requestedAmountCents ?? this.sumRequestedItems(dto.items);

    const createdGuide = await this.prisma.$transaction(async (transaction) => {
      const guide = await transaction.billingGuide.create({
        data: {
          guideNumber,
          authorizationCode: this.optionalText(dto.authorizationCode),
          patientId: dto.patientId,
          appointmentId: dto.appointmentId,
          providerId: dto.providerId,
          currentStatus: initialStatus,
          originSector: this.optionalText(dto.originSector),
          careType: this.optionalText(dto.careType),
          requestedAmountCents,
          authorizedAmountCents: dto.authorizedAmountCents ?? 0,
          notes: this.optionalText(dto.notes),
          createdById: userId,
          updatedById: userId,
          items: {
            create: this.normalizeItems(dto.items),
          },
        },
      });

      await transaction.billingGuideMovement.create({
        data: {
          guideId: guide.id,
          movementType: BillingGuideMovementType.OPENED,
          toStatus: initialStatus,
          sector: this.optionalText(dto.originSector),
          responsibleUserId: userId,
          notes: this.optionalText(dto.notes) ?? 'Guia aberta no sistema.',
          amountCents: requestedAmountCents,
        },
      });

      return transaction.billingGuide.findUniqueOrThrow({
        where: { id: guide.id },
        include: this.defaultInclude(),
      });
    });

    return createdGuide;
  }

  async findAll(query: QueryBillingGuideDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.BillingGuideWhereInput = {};

    if (query.status) {
      where.currentStatus = query.status;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    if (query.providerId) {
      where.providerId = query.providerId;
    }

    const createdFrom = this.parseDate(query.createdFrom, 'Data inicial invalida');
    const createdTo = this.parseDate(query.createdTo, 'Data final invalida');

    if (createdFrom || createdTo) {
      where.createdAt = {
        gte: createdFrom,
        lte: createdTo,
      };
    }

    if (search) {
      const searchDigits = search.replace(/\D/g, '');
      const cpfSearch = searchDigits.length > 0 ? searchDigits : search;

      where.OR = [
        { guideNumber: { contains: search, mode: 'insensitive' } },
        { authorizationCode: { contains: search, mode: 'insensitive' } },
        { originSector: { contains: search, mode: 'insensitive' } },
        { careType: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { cpf: { contains: cpfSearch } } },
        { provider: { name: { contains: search, mode: 'insensitive' } } },
        { provider: { code: { contains: search, mode: 'insensitive' } } },
        {
          movements: {
            some: {
              OR: [
                { reason: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                { sector: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [guides, total] = await Promise.all([
      this.prisma.billingGuide.findMany({
        where,
        skip,
        take: limit,
        include: this.defaultInclude(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.billingGuide.count({ where }),
    ]);

    return {
      data: guides,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const guide = await this.prisma.billingGuide.findUnique({
      where: { id },
      include: this.defaultInclude({ movementLimit: 50 }),
    });

    if (!guide) {
      throw new NotFoundException('Guia nao encontrada');
    }

    return guide;
  }

  async moveBillingGuide(
    id: string,
    dto: MoveBillingGuideDto,
    userId?: string,
  ) {
    const guide = await this.prisma.billingGuide.findUnique({
      where: { id },
      select: {
        id: true,
        currentStatus: true,
        closedAt: true,
      },
    });

    if (!guide) {
      throw new NotFoundException('Guia nao encontrada');
    }

    this.ensureTransitionAllowed(
      guide.currentStatus,
      dto.toStatus,
      dto.movementType,
    );

    const movementType = this.inferMovementType(dto.toStatus, dto.movementType);
    const closedAt =
      dto.toStatus === BillingGuideStatus.CLOSED ? new Date() : guide.closedAt;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.billingGuide.update({
        where: { id },
        data: {
          currentStatus: dto.toStatus,
          closedAt,
          updatedById: userId,
          requestedAmountCents: dto.requestedAmountCents,
          authorizedAmountCents: dto.authorizedAmountCents,
          paidAmountCents: dto.paidAmountCents,
          deniedAmountCents: dto.deniedAmountCents,
          appealedAmountCents: dto.appealedAmountCents,
        },
      });

      await transaction.billingGuideMovement.create({
        data: {
          guideId: id,
          movementType,
          fromStatus: guide.currentStatus,
          toStatus: dto.toStatus,
          sector: this.optionalText(dto.sector),
          responsibleUserId: userId,
          reason: this.optionalText(dto.reason),
          notes: this.optionalText(dto.notes),
          amountCents: dto.amountCents,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      return transaction.billingGuide.findUniqueOrThrow({
        where: { id },
        include: this.defaultInclude({ movementLimit: 50 }),
      });
    });
  }

  async listMovements(id: string) {
    await this.ensureGuideExists(id);

    return this.prisma.billingGuideMovement.findMany({
      where: { guideId: id },
      include: {
        responsibleUser: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async validateReferences(dto: CreateBillingGuideDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente nao encontrado');
    }

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
        select: { id: true, patientId: true },
      });

      if (!appointment) {
        throw new NotFoundException('Atendimento nao encontrado');
      }

      if (appointment.patientId !== dto.patientId) {
        throw new BadRequestException(
          'Atendimento informado nao pertence ao paciente da guia',
        );
      }
    }

    if (dto.providerId) {
      const provider = await this.prisma.healthInsuranceProvider.findUnique({
        where: { id: dto.providerId },
        select: { id: true },
      });

      if (!provider) {
        throw new NotFoundException('Convenio nao encontrado');
      }
    }

    await this.validateItems(dto.items);
  }

  private async validateItems(items?: CreateBillingGuideItemDto[]) {
    if (!items?.length) {
      return;
    }

    const uniqueKeys = new Set<string>();

    for (const item of items) {
      const key = `${item.procedureId}:${item.pricingTableId ?? 'sem-tabela'}`;

      if (uniqueKeys.has(key)) {
        throw new BadRequestException(
          'A guia possui procedimento duplicado para a mesma tabela',
        );
      }

      uniqueKeys.add(key);
    }

    const procedureIds = [...new Set(items.map((item) => item.procedureId))];
    const pricingTableIds = [
      ...new Set(
        items
          .map((item) => item.pricingTableId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [procedures, pricingTables] = await Promise.all([
      this.prisma.procedure.findMany({
        where: { id: { in: procedureIds }, active: true },
        select: { id: true },
      }),
      pricingTableIds.length
        ? this.prisma.pricingTable.findMany({
            where: { id: { in: pricingTableIds }, active: true },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (procedures.length !== procedureIds.length) {
      throw new NotFoundException(
        'Um ou mais procedimentos ativos nao foram encontrados',
      );
    }

    if (pricingTables.length !== pricingTableIds.length) {
      throw new NotFoundException(
        'Uma ou mais tabelas de preco ativas nao foram encontradas',
      );
    }
  }

  private async ensureGuideExists(id: string) {
    const guide = await this.prisma.billingGuide.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!guide) {
      throw new NotFoundException('Guia nao encontrada');
    }
  }

  private async ensureGuideNumberAvailable(guideNumber: string) {
    const existingGuide = await this.prisma.billingGuide.findUnique({
      where: { guideNumber },
      select: { id: true },
    });

    if (existingGuide) {
      throw new ConflictException('Numero de guia ja cadastrado');
    }
  }

  private ensureTransitionAllowed(
    fromStatus: BillingGuideStatus,
    toStatus: BillingGuideStatus,
    movementType?: BillingGuideMovementType,
  ) {
    const isSameStatus = fromStatus === toStatus;
    const canRepeatStatus =
      movementType === BillingGuideMovementType.COMMENT ||
      movementType === BillingGuideMovementType.DOCUMENT_ATTACHED;

    if (isSameStatus && canRepeatStatus) {
      return;
    }

    if (isSameStatus) {
      throw new BadRequestException(
        'Para manter o mesmo status, informe COMMENT ou DOCUMENT_ATTACHED',
      );
    }

    if (!allowedTransitions[fromStatus].includes(toStatus)) {
      throw new BadRequestException(
        `Movimentacao de ${fromStatus} para ${toStatus} nao permitida`,
      );
    }
  }

  private inferMovementType(
    toStatus: BillingGuideStatus,
    movementType?: BillingGuideMovementType,
  ) {
    if (movementType) {
      return movementType;
    }

    const statusMap: Partial<
      Record<BillingGuideStatus, BillingGuideMovementType>
    > = {
      AUTHORIZATION_PENDING:
        BillingGuideMovementType.AUTHORIZATION_REQUESTED,
      AUTHORIZED: BillingGuideMovementType.AUTHORIZED,
      PARTIALLY_AUTHORIZED: BillingGuideMovementType.AUTHORIZED,
      DENIED: BillingGuideMovementType.DENIED,
      IN_EXECUTION: BillingGuideMovementType.EXECUTION_RECORDED,
      EXECUTED: BillingGuideMovementType.EXECUTION_RECORDED,
      ACCOUNT_REVIEW: BillingGuideMovementType.ACCOUNT_REVIEW,
      SENT_TO_PROVIDER: BillingGuideMovementType.SENT_TO_PROVIDER,
      PAID: BillingGuideMovementType.PROVIDER_RETURN,
      PARTIALLY_PAID: BillingGuideMovementType.PROVIDER_RETURN,
      GLOSA: BillingGuideMovementType.GLOSA_RECORDED,
      PENDING_DOCUMENTATION: BillingGuideMovementType.PROVIDER_RETURN,
      REJECTED: BillingGuideMovementType.PROVIDER_RETURN,
      APPEAL_IN_PROGRESS: BillingGuideMovementType.APPEAL_CREATED,
      APPEAL_ACCEPTED: BillingGuideMovementType.APPEAL_RETURN,
      APPEAL_DENIED: BillingGuideMovementType.APPEAL_RETURN,
      LOSS_ACCEPTED: BillingGuideMovementType.APPEAL_RETURN,
      CLOSED: BillingGuideMovementType.CLOSED,
      CANCELED: BillingGuideMovementType.CANCELED,
    };

    return statusMap[toStatus] ?? BillingGuideMovementType.STATUS_CHANGED;
  }

  private defaultInclude(options?: {
    movementLimit?: number;
  }): Prisma.BillingGuideInclude {
    return {
      patient: {
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          status: true,
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
      provider: {
        select: {
          id: true,
          name: true,
          code: true,
          active: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      items: {
        include: {
          procedure: true,
          pricingTable: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      movements: {
        take: options?.movementLimit ?? 8,
        include: {
          responsibleUser: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    };
  }

  private normalizeItems(items?: CreateBillingGuideItemDto[]) {
    return (
      items?.map((item) => ({
        procedureId: item.procedureId,
        pricingTableId: item.pricingTableId,
        quantity: item.quantity ?? 1,
        status: item.status,
        requestedAmountCents: item.requestedAmountCents ?? 0,
        notes: this.optionalText(item.notes),
      })) ?? []
    );
  }

  private sumRequestedItems(items?: CreateBillingGuideItemDto[]) {
    return (
      items?.reduce(
        (total, item) => total + (item.requestedAmountCents ?? 0),
        0,
      ) ?? 0
    );
  }

  private async generateGuideNumber() {
    const today = new Date();
    const datePart = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `INT-${datePart}-${randomInt(100000, 999999)}`;
      const existingGuide = await this.prisma.billingGuide.findUnique({
        where: { guideNumber: candidate },
        select: { id: true },
      });

      if (!existingGuide) {
        return candidate;
      }
    }

    throw new ConflictException('Nao foi possivel gerar numero de guia unico');
  }

  private parseDate(value: string | undefined, message: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(message);
    }

    return date;
  }

  private normalizeGuideNumber(value: string) {
    return value.trim().replace(/\s+/g, '-').toUpperCase();
  }

  private optionalText(value?: string | null) {
    return value?.trim() || undefined;
  }
}
