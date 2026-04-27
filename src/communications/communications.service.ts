import { Injectable } from '@nestjs/common';
import { CommunicationType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CommunicationDashboardDto } from './dto/communication-dashboard.dto';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<CommunicationDashboardDto> {
    const [updates, notices, commemorativeDates, emails] = await Promise.all([
      this.findEntries(CommunicationType.UPDATE, { publishAt: 'desc' }),
      this.findEntries(CommunicationType.NOTICE, { publishAt: 'desc' }),
      this.findEntries(CommunicationType.HOLIDAY, { publishAt: 'asc' }),
      this.prisma.internalEmail.findMany({
        where: { active: true },
        orderBy: { sentAt: 'desc' },
        take: 8,
      }),
    ]);

    return {
      updates,
      notices,
      commemorativeDates,
      emails: emails.map((email) => ({
        id: email.id,
        from: email.sender,
        subject: email.subject,
        preview: email.preview,
        body: email.body,
        timeLabel: email.timeLabel,
        unread: email.unread,
        sentAt: email.sentAt,
      })),
    };
  }

  private findEntries(
    type: CommunicationType,
    orderBy: Prisma.CommunicationEntryOrderByWithRelationInput,
  ) {
    return this.prisma.communicationEntry.findMany({
      where: {
        active: true,
        type,
      },
      orderBy,
      take: 8,
    });
  }
}
