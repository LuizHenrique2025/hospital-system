import { CommunicationType, InternalMessagePriority, Role } from '@prisma/client';

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
  to?: string;
  senderId?: string;
  recipientId?: string;
  subject: string;
  preview: string;
  body?: string | null;
  priority?: InternalMessagePriority;
  timeLabel?: string | null;
  unread: boolean;
  sentAt: Date;
  readAt?: Date | null;
}

export class CommunicationDashboardDto {
  updates: CommunicationEntryDto[];
  notices: CommunicationEntryDto[];
  commemorativeDates: CommunicationEntryDto[];
  emails: InternalEmailDto[];
}

export class InternalRecipientDto {
  id: string;
  name: string;
  username: string;
  role: Role;
}
