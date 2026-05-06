import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetEstimateStatus, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { BillingGuidesService } from '../billing-guides/billing-guides.service';
import { ApproveBudgetEstimateDto } from './dto/approve-budget-estimate.dto';
import {
  CreateBudgetEstimateDto,
  CreateBudgetEstimateItemDto,
} from './dto/create-budget-estimate.dto';
import { QueryBudgetEstimateDto } from './dto/query-budget-estimate.dto';

type HydratedBudgetItem = {
  procedureId: string;
  pricingTableId?: string;
  procedurePriceId?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  operationalCostCents?: number;
  discountCents: number;
  totalCents: number;
  notes?: string;
};

type ProcedurePriceWithTable = Prisma.ProcedurePriceGetPayload<{
  include: { pricingTable: true };
}>;

@Injectable()
export class BudgetEstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingGuidesService: BillingGuidesService,
  ) {}

  async calculateEstimate(dto: CreateBudgetEstimateDto) {
    await this.validateHeaderReferences(dto);
    const items = await this.hydrateItems(dto.items);
    const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
    const discountCents = dto.discountCents ?? 0;
    const totalCents = Math.max(subtotalCents - discountCents, 0);

    return {
      subtotalCents,
      discountCents,
      totalCents,
      items,
    };
  }

  async createEstimate(dto: CreateBudgetEstimateDto, userId?: string) {
    const creatableStatuses: BudgetEstimateStatus[] = [
      BudgetEstimateStatus.DRAFT,
      BudgetEstimateStatus.PENDING_APPROVAL,
    ];

    if (dto.status && !creatableStatuses.includes(dto.status)) {
      throw new BadRequestException(
        'Use a rota de aprovacao para aprovar ou converter orcamentos',
      );
    }

    await this.validateHeaderReferences(dto);
    const code = await this.generateEstimateCode();
    const items = await this.hydrateItems(dto.items);
    const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
    const discountCents = dto.discountCents ?? 0;
    const totalCents = Math.max(subtotalCents - discountCents, 0);

    return this.prisma.budgetEstimate.create({
      data: {
        code,
        patientId: dto.patientId,
        providerId: dto.providerId,
        status: dto.status ?? BudgetEstimateStatus.DRAFT,
        title: this.optionalText(dto.title),
        notes: this.optionalText(dto.notes),
        subtotalCents,
        discountCents,
        totalCents,
        expiresAt: this.parseDate(dto.expiresAt, 'Data de validade invalida'),
        createdById: userId,
        items: {
          create: items.map((item) => ({
            procedureId: item.procedureId,
            pricingTableId: item.pricingTableId,
            procedurePriceId: item.procedurePriceId,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            operationalCostCents: item.operationalCostCents,
            discountCents: item.discountCents,
            totalCents: item.totalCents,
            notes: item.notes,
          })),
        },
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(query: QueryBudgetEstimateDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const search = query.q?.trim();
    const where: Prisma.BudgetEstimateWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.providerId) {
      where.providerId = query.providerId;
    }

    if (search) {
      const digits = search.replace(/\D/g, '');
      const cpfSearch = digits.length > 0 ? digits : search;

      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { cpf: { contains: cpfSearch } } },
        { provider: { name: { contains: search, mode: 'insensitive' } } },
        { provider: { code: { contains: search, mode: 'insensitive' } } },
        {
          items: {
            some: {
              OR: [
                { description: { contains: search, mode: 'insensitive' } },
                {
                  procedure: {
                    code: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  procedure: {
                    description: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const [estimates, total] = await Promise.all([
      this.prisma.budgetEstimate.findMany({
        where,
        skip,
        take: limit,
        include: this.defaultInclude(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.budgetEstimate.count({ where }),
    ]);

    return {
      data: estimates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const estimate = await this.prisma.budgetEstimate.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!estimate) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    return estimate;
  }

  async approveEstimate(
    id: string,
    dto: ApproveBudgetEstimateDto,
    userId?: string,
  ) {
    const estimate = await this.prisma.budgetEstimate.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!estimate) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    if (!estimate.patientId) {
      throw new BadRequestException(
        'Selecione um paciente antes de aprovar o orcamento',
      );
    }

    const blockedStatuses: BudgetEstimateStatus[] = [
      BudgetEstimateStatus.CANCELED,
      BudgetEstimateStatus.EXPIRED,
    ];

    if (blockedStatuses.includes(estimate.status)) {
      throw new BadRequestException('Orcamento cancelado ou expirado');
    }

    if (estimate.status === BudgetEstimateStatus.CONVERTED) {
      throw new ConflictException('Orcamento ja convertido em guia');
    }

    const shouldCreateGuide = dto.createBillingGuide !== false;
    const convertedGuide = shouldCreateGuide
      ? await this.billingGuidesService.createBillingGuide(
          {
            guideNumber: dto.guideNumber,
            authorizationCode: dto.authorizationCode,
            patientId: estimate.patientId,
            providerId: estimate.providerId ?? undefined,
            currentStatus: undefined,
            originSector: dto.originSector ?? 'Hospitalar',
            careType: 'ORCAMENTO_APROVADO',
            requestedAmountCents: estimate.totalCents,
            notes:
              this.optionalText(dto.notes) ??
              `Guia gerada pelo orcamento ${estimate.code}.`,
            items: estimate.items.map((item) => ({
              procedureId: item.procedureId,
              pricingTableId: item.pricingTableId ?? undefined,
              quantity: item.quantity,
              requestedAmountCents: item.totalCents,
              notes: item.notes ?? undefined,
            })),
          },
          userId,
        )
      : null;

    return this.prisma.budgetEstimate.update({
      where: { id },
      data: {
        status: convertedGuide
          ? BudgetEstimateStatus.CONVERTED
          : BudgetEstimateStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: userId,
        convertedGuideId: convertedGuide?.id,
        notes: dto.notes
          ? [estimate.notes, dto.notes].filter(Boolean).join('\n')
          : estimate.notes,
      },
      include: this.defaultInclude(),
    });
  }

  private async validateHeaderReferences(dto: CreateBudgetEstimateDto) {
    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true },
      });

      if (!patient) {
        throw new NotFoundException('Paciente nao encontrado');
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
  }

  private async hydrateItems(
    items: CreateBudgetEstimateItemDto[],
  ): Promise<HydratedBudgetItem[]> {
    const procedureIds = [...new Set(items.map((item) => item.procedureId))];
    const procedurePriceIds = [
      ...new Set(
        items
          .map((item) => item.procedurePriceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [procedures, explicitPrices] = await Promise.all([
      this.prisma.procedure.findMany({
        where: { id: { in: procedureIds }, active: true },
      }),
      procedurePriceIds.length
        ? this.prisma.procedurePrice.findMany({
            where: { id: { in: procedurePriceIds }, active: true },
            include: { pricingTable: true },
          })
        : Promise.resolve([] as ProcedurePriceWithTable[]),
    ]);

    if (procedures.length !== procedureIds.length) {
      throw new NotFoundException(
        'Um ou mais procedimentos ativos nao foram encontrados',
      );
    }

    if (explicitPrices.length !== procedurePriceIds.length) {
      throw new NotFoundException(
        'Um ou mais valores de tabela nao foram encontrados',
      );
    }

    const proceduresById = new Map(
      procedures.map((procedure) => [procedure.id, procedure]),
    );
    const explicitPricesById = new Map<string, ProcedurePriceWithTable>(
      explicitPrices.map((price) => [price.id, price] as const),
    );

    return Promise.all(
      items.map(async (item) => {
        const procedure = proceduresById.get(item.procedureId);

        if (!procedure) {
          throw new NotFoundException('Procedimento nao encontrado');
        }

        const explicitPrice = item.procedurePriceId
          ? explicitPricesById.get(item.procedurePriceId)
          : null;

        if (explicitPrice && explicitPrice.procedureId !== item.procedureId) {
          throw new BadRequestException(
            'Valor de tabela nao pertence ao procedimento informado',
          );
        }

        const tablePrice =
          explicitPrice ??
          (item.pricingTableId
            ? await this.prisma.procedurePrice.findUnique({
                where: {
                  procedureId_pricingTableId: {
                    procedureId: item.procedureId,
                    pricingTableId: item.pricingTableId,
                  },
                },
                include: { pricingTable: true },
              })
            : null);

        const quantity = item.quantity ?? 1;
        const unitPriceCents =
          item.unitPriceCents ??
          tablePrice?.priceCents ??
          procedure.referencePriceCents ??
          0;
        const operationalCostCents =
          item.operationalCostCents ?? tablePrice?.operationalCostCents ?? 0;
        const discountCents = item.discountCents ?? 0;
        const totalCents = Math.max(
          quantity * unitPriceCents + operationalCostCents - discountCents,
          0,
        );

        return {
          procedureId: item.procedureId,
          pricingTableId: item.pricingTableId ?? tablePrice?.pricingTableId,
          procedurePriceId: item.procedurePriceId ?? tablePrice?.id,
          description: procedure.description,
          quantity,
          unitPriceCents,
          operationalCostCents,
          discountCents,
          totalCents,
          notes: this.optionalText(item.notes),
        };
      }),
    );
  }

  private defaultInclude(): Prisma.BudgetEstimateInclude {
    return {
      patient: {
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          email: true,
          status: true,
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
      convertedGuide: {
        select: {
          id: true,
          guideNumber: true,
          currentStatus: true,
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
      approvedBy: {
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
          procedurePrice: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    };
  }

  private async generateEstimateCode() {
    const today = new Date();
    const datePart = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `ORC-${datePart}-${randomInt(100000, 999999)}`;
      const existingEstimate = await this.prisma.budgetEstimate.findUnique({
        where: { code: candidate },
        select: { id: true },
      });

      if (!existingEstimate) {
        return candidate;
      }
    }

    throw new ConflictException('Nao foi possivel gerar codigo de orcamento');
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

  private optionalText(value?: string | null) {
    return value?.trim() || undefined;
  }
}
