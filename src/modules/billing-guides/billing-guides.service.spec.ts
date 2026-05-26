import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BillingGuideMovementType,
  BillingGuideStatus,
} from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { BillingGuidesService } from './billing-guides.service';

describe('BillingGuidesService', () => {
  let service: BillingGuidesService;

  const transaction = {
    billingGuide: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    billingGuideMovement: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    appointment: {
      findUnique: jest.fn(),
    },
    billingGuide: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    billingGuideMovement: {
      findMany: jest.fn(),
    },
    healthInsuranceProvider: {
      findUnique: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    pricingTable: {
      findMany: jest.fn(),
    },
    procedure: {
      findMany: jest.fn(),
    },
  };

  const guide = {
    id: 'guide-1',
    guideNumber: 'HDR-001',
    currentStatus: BillingGuideStatus.OPEN,
    requestedAmountCents: 15000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation((callback) =>
      callback(transaction),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingGuidesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BillingGuidesService>(BillingGuidesService);
  });

  it('should create a guide with items and an opening movement', async () => {
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appointment-1',
      patientId: 'patient-1',
    });
    mockPrismaService.healthInsuranceProvider.findUnique.mockResolvedValue({
      id: 'provider-1',
    });
    mockPrismaService.procedure.findMany.mockResolvedValue([
      { id: 'procedure-1' },
    ]);
    mockPrismaService.pricingTable.findMany.mockResolvedValue([
      { id: 'table-1' },
    ]);
    mockPrismaService.billingGuide.findUnique.mockResolvedValue(null);
    transaction.billingGuide.create.mockResolvedValue({ id: 'guide-1' });
    transaction.billingGuide.findUniqueOrThrow.mockResolvedValue(guide);

    await expect(
      service.createBillingGuide(
        {
          guideNumber: ' hdr 001 ',
          patientId: 'patient-1',
          appointmentId: 'appointment-1',
          providerId: 'provider-1',
          originSector: ' Faturamento ',
          items: [
            {
              procedureId: 'procedure-1',
              pricingTableId: 'table-1',
              quantity: 2,
              requestedAmountCents: 15000,
            },
          ],
        },
        'user-1',
      ),
    ).resolves.toEqual(guide);

    expect(transaction.billingGuide.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guideNumber: 'HDR-001',
        patientId: 'patient-1',
        requestedAmountCents: 15000,
        createdById: 'user-1',
        items: {
          create: [
            expect.objectContaining({
              procedureId: 'procedure-1',
              pricingTableId: 'table-1',
              quantity: 2,
              requestedAmountCents: 15000,
            }),
          ],
        },
      }),
    });
    expect(transaction.billingGuideMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guideId: 'guide-1',
        movementType: BillingGuideMovementType.OPENED,
        toStatus: BillingGuideStatus.OPEN,
        responsibleUserId: 'user-1',
        amountCents: 15000,
      }),
    });
  });

  it('should reject duplicate guide numbers', async () => {
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.procedure.findMany.mockResolvedValue([]);
    mockPrismaService.billingGuide.findUnique.mockResolvedValue({
      id: 'existing-guide',
    });

    await expect(
      service.createBillingGuide({
        guideNumber: 'HDR-001',
        patientId: 'patient-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should reject appointments from another patient', async () => {
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appointment-1',
      patientId: 'patient-2',
    });

    await expect(
      service.createBillingGuide({
        patientId: 'patient-1',
        appointmentId: 'appointment-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject duplicated procedures for the same pricing table', async () => {
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'patient-1' });

    await expect(
      service.createBillingGuide({
        patientId: 'patient-1',
        items: [
          { procedureId: 'procedure-1', pricingTableId: 'table-1' },
          { procedureId: 'procedure-1', pricingTableId: 'table-1' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should list guides with capped pagination and search filters', async () => {
    mockPrismaService.billingGuide.findMany.mockResolvedValue([guide]);
    mockPrismaService.billingGuide.count.mockResolvedValue(1);

    const result = await service.findAll({
      page: 0,
      limit: 200,
      q: 'HDR Maria 123.456',
      status: BillingGuideStatus.OPEN,
      createdFrom: '2026-05-01',
      createdTo: '2026-05-23',
    });

    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    expect(mockPrismaService.billingGuide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
        where: expect.objectContaining({
          currentStatus: BillingGuideStatus.OPEN,
          OR: expect.arrayContaining([
            {
              guideNumber: {
                contains: 'HDR Maria 123.456',
                mode: 'insensitive',
              },
            },
            { patient: { cpf: { contains: '123456' } } },
          ]),
        }),
      }),
    );
  });

  it('should move a guide and register a glosa movement', async () => {
    mockPrismaService.billingGuide.findUnique.mockResolvedValue({
      id: 'guide-1',
      currentStatus: BillingGuideStatus.SENT_TO_PROVIDER,
      closedAt: null,
    });
    transaction.billingGuide.findUniqueOrThrow.mockResolvedValue({
      ...guide,
      currentStatus: BillingGuideStatus.GLOSA,
    });

    await service.moveBillingGuide(
      'guide-1',
      {
        toStatus: BillingGuideStatus.GLOSA,
        sector: 'Faturamento',
        reason: 'Valor glosado pela operadora',
        deniedAmountCents: 8000,
      },
      'user-1',
    );

    expect(transaction.billingGuide.update).toHaveBeenCalledWith({
      where: { id: 'guide-1' },
      data: expect.objectContaining({
        currentStatus: BillingGuideStatus.GLOSA,
        updatedById: 'user-1',
        deniedAmountCents: 8000,
      }),
    });
    expect(transaction.billingGuideMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guideId: 'guide-1',
        movementType: BillingGuideMovementType.GLOSA_RECORDED,
        fromStatus: BillingGuideStatus.SENT_TO_PROVIDER,
        toStatus: BillingGuideStatus.GLOSA,
        responsibleUserId: 'user-1',
      }),
    });
  });

  it('should reject invalid status transitions', async () => {
    mockPrismaService.billingGuide.findUnique.mockResolvedValue({
      id: 'guide-1',
      currentStatus: BillingGuideStatus.OPEN,
      closedAt: null,
    });

    await expect(
      service.moveBillingGuide('guide-1', {
        toStatus: BillingGuideStatus.GLOSA,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should allow same-status comments without changing financial state', async () => {
    mockPrismaService.billingGuide.findUnique.mockResolvedValue({
      id: 'guide-1',
      currentStatus: BillingGuideStatus.OPEN,
      closedAt: null,
    });
    transaction.billingGuide.findUniqueOrThrow.mockResolvedValue(guide);

    await service.moveBillingGuide('guide-1', {
      toStatus: BillingGuideStatus.OPEN,
      movementType: BillingGuideMovementType.COMMENT,
      notes: 'Documentacao conferida.',
    });

    expect(transaction.billingGuideMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: BillingGuideMovementType.COMMENT,
        fromStatus: BillingGuideStatus.OPEN,
        toStatus: BillingGuideStatus.OPEN,
      }),
    });
  });

  it('should fail movements for missing guides', async () => {
    mockPrismaService.billingGuide.findUnique.mockResolvedValue(null);

    await expect(
      service.moveBillingGuide('missing-guide', {
        toStatus: BillingGuideStatus.AUTHORIZED,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
