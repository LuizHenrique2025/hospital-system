import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

type AuditRecordInput = {
  action: AuditAction;
  actorId?: string;
  actorRole?: Role;
  ipAddress?: string;
  metadata?: Prisma.InputJsonValue;
  method: string;
  resource: string;
  resourceId?: string;
  route: string;
  statusCode?: number;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        actorRole: input.actorRole,
        ipAddress: input.ipAddress,
        metadata: input.metadata ?? Prisma.JsonNull,
        method: input.method,
        resource: input.resource,
        resourceId: input.resourceId,
        route: input.route,
        statusCode: input.statusCode,
        userAgent: input.userAgent,
      },
    });
  }

  async findAll(query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.actorRole ? { actorRole: query.actorRole } : {}),
      ...(query.resource ? { resource: query.resource } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary() {
    const since = new Date();
    since.setDate(since.getDate() - 1);

    const [total, last24h, patientAccesses, writeOperations] =
      await Promise.all([
        this.prisma.auditLog.count(),
        this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: since,
            },
          },
        }),
        this.prisma.auditLog.count({
          where: {
            resource: 'patients',
            action: AuditAction.READ,
          },
        }),
        this.prisma.auditLog.count({
          where: {
            action: {
              in: [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
            },
          },
        }),
      ]);

    return {
      total,
      last24h,
      patientAccesses,
      writeOperations,
      retentionPolicy:
        'Auditoria operacional preservada para rastreabilidade LGPD/SBIS.',
    };
  }
}
