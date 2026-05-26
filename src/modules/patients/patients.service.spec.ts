import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Gender, PatientStatus } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let service: PatientsService;

  const mockPrismaService = {
    patient: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const basePatient = {
    id: 'patient-1',
    name: 'Maria Souza',
    cpf: '12345678901',
    rg: null,
    birthDate: new Date('1990-01-15T00:00:00.000Z'),
    gender: Gender.FEMININO,
    bloodType: null,
    phone: '11999999999',
    email: 'maria@example.com',
    status: PatientStatus.ACTIVE,
    blockReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should create a patient when CPF is available', async () => {
    mockPrismaService.patient.findUnique.mockResolvedValue(null);
    mockPrismaService.patient.create.mockResolvedValue(basePatient);

    const result = await service.createPatient({
      name: 'Maria Souza',
      cpf: '12345678901',
      birthDate: '1990-01-15',
      gender: Gender.FEMININO,
      phone: '11999999999',
    });

    expect(result).toEqual(basePatient);
    expect(mockPrismaService.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cpf: '12345678901',
        birthDate: new Date('1990-01-15'),
      }),
    });
  });

  it('should reject duplicate CPF on create', async () => {
    mockPrismaService.patient.findUnique.mockResolvedValue(basePatient);

    await expect(
      service.createPatient({
        name: 'Maria Souza',
        cpf: '12345678901',
        birthDate: '1990-01-15',
        gender: Gender.FEMININO,
        phone: '11999999999',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockPrismaService.patient.create).not.toHaveBeenCalled();
  });

  it('should find paginated active patients with a light select payload', async () => {
    mockPrismaService.patient.findMany.mockResolvedValue([basePatient]);
    mockPrismaService.patient.count.mockResolvedValue(1);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      q: 'Maria 123.456',
    });

    expect(result.meta).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });
    expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: expect.not.objectContaining({
          allergies: true,
          documents: true,
          medicalHistory: true,
        }),
        where: expect.objectContaining({
          status: { not: PatientStatus.INACTIVE },
          OR: expect.arrayContaining([
            { name: { contains: 'Maria 123.456', mode: 'insensitive' } },
            { cpf: { contains: '123456' } },
          ]),
        }),
      }),
    );
  });

  it('should return one active patient by id', async () => {
    mockPrismaService.patient.findFirst.mockResolvedValue(basePatient);

    await expect(service.findOne('patient-1')).resolves.toEqual(basePatient);
    expect(mockPrismaService.patient.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'patient-1',
        status: { not: PatientStatus.INACTIVE },
      },
    });
  });

  it('should fail when patient is not found', async () => {
    mockPrismaService.patient.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should clear block reason when status leaves BLOCKED', async () => {
    mockPrismaService.patient.findFirst.mockResolvedValue(basePatient);
    mockPrismaService.patient.update.mockResolvedValue({
      ...basePatient,
      status: PatientStatus.ACTIVE,
      blockReason: null,
    });

    await service.updatePatient('patient-1', { status: PatientStatus.ACTIVE });

    expect(mockPrismaService.patient.update).toHaveBeenCalledWith({
      where: { id: 'patient-1' },
      data: { status: PatientStatus.ACTIVE, blockReason: null },
    });
  });

  it('should reject CPF already used by another patient', async () => {
    mockPrismaService.patient.findFirst.mockResolvedValue(basePatient);
    mockPrismaService.patient.findUnique.mockResolvedValue({
      ...basePatient,
      id: 'patient-2',
    });

    await expect(
      service.updatePatient('patient-1', { cpf: '12345678901' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should soft delete patients instead of removing history', async () => {
    mockPrismaService.patient.findFirst.mockResolvedValue(basePatient);
    mockPrismaService.patient.update.mockResolvedValue({
      ...basePatient,
      status: PatientStatus.INACTIVE,
    });

    await expect(service.deletePatient('patient-1')).resolves.toEqual({
      message: 'Paciente inativado com sucesso',
    });
    expect(mockPrismaService.patient.update).toHaveBeenCalledWith({
      where: { id: 'patient-1' },
      data: {
        status: PatientStatus.INACTIVE,
        blockReason: 'Cadastro inativado por exclusao administrativa',
      },
    });
  });
});
