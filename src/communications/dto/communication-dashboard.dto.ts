import { CommunicationType } from '@prisma/client';

export class CommunicationEntryDto {
  id: string;
  type: CommunicationType;
  tag?: string | null;
  title: string;
  description: string;
  dateLabel?: string | null;
  publishAt: Date;
}

export class InternalEmailDto {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body?: string | null;
  timeLabel?: string | null;
  unread: boolean;
  sentAt: Date;
}

export class CommunicationDashboardDto {
  updates: CommunicationEntryDto[];
  notices: CommunicationEntryDto[];
  commemorativeDates: CommunicationEntryDto[];
  emails: InternalEmailDto[];
}
