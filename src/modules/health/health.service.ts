import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      });
    }

    return {
      status: 'ok',
      database: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }
}
