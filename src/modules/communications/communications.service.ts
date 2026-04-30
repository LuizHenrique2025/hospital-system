import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunicationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CommunicationDashboardDto,
  InternalEmailDto,
  InternalRecipientDto,
} from './dto/communication-dashboard.dto';
import { CreateInternalMessageDto } from './dto/create-internal-message.dto';
import { MailboxFolder } from './dto/query-internal-messages.dto';

const internalMessageUserSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
} satisfies Prisma.UserSelect;

type InternalMessageWithUsers = Prisma.InternalMessageGetPayload<{
  include: {
    sender: { select: typeof internalMessageUserSelect };
    recipient: { select: typeof internalMessageUserSelect };
  };
}>;

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string): Promise<CommunicationDashboardDto> {
    const [updates, notices, commemorativeDates, emails] = await Promise.all([
      this.findEntries(CommunicationType.UPDATE, { publishAt: 'desc' }),
      this.findEntries(CommunicationType.NOTICE, { publishAt: 'desc' }),
      this.findEntries(CommunicationType.HOLIDAY, { publishAt: 'asc' }),
      this.listMessages(userId, 'inbox', 8),
    ]);

    return {
      updates,
      notices,
      commemorativeDates,
      emails,
    };
  }

  async listRecipients(currentUserId: string): Promise<InternalRecipientDto[]> {
    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
      },
      orderBy: { name: 'asc' },
      select: internalMessageUserSelect,
    });
  }

  async createMessage(senderId: string, dto: CreateInternalMessageDto) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Nao e possivel enviar mensagem para si mesmo');
    }

    const [sender, recipient] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: internalMessageUserSelect,
      }),
      this.prisma.user.findUnique({
        where: { id: dto.recipientId },
        select: internalMessageUserSelect,
      }),
    ]);

    if (!sender) {
      throw new NotFoundException('Usuario remetente nao encontrado');
    }

    if (!recipient) {
      throw new NotFoundException('Destinatario nao encontrado');
    }

    const message = await this.prisma.internalMessage.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        priority: dto.priority,
      },
      include: this.internalMessageInclude(),
    });

    return this.mapMessage(message, senderId);
  }

  async listMessages(
    userId: string,
    box: MailboxFolder = 'inbox',
    take = 30,
  ): Promise<InternalEmailDto[]> {
    const messages = await this.prisma.internalMessage.findMany({
      where: this.mailboxWhere(userId, box),
      orderBy: { createdAt: 'desc' },
      take,
      include: this.internalMessageInclude(),
    });

    return messages.map((message) => this.mapMessage(message, userId));
  }

  async markAsRead(userId: string, messageId: string) {
    const message = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        recipientId: userId,
        deletedByRecipient: false,
      },
      include: this.internalMessageInclude(),
    });

    if (!message) {
      throw new NotFoundException('Mensagem nao encontrada');
    }

    if (message.readAt) {
      return this.mapMessage(message, userId);
    }

    const updated = await this.prisma.internalMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
      include: this.internalMessageInclude(),
    });

    return this.mapMessage(updated, userId);
  }

  async archiveMessage(userId: string, messageId: string) {
    const message = await this.findMessageForUser(userId, messageId);

    const updated = await this.prisma.internalMessage.update({
      where: { id: message.id },
      data: this.visibilityUpdate(message, userId, {
        archived: true,
        deleted: false,
      }),
      include: this.internalMessageInclude(),
    });

    return this.mapMessage(updated, userId);
  }

  async restoreMessage(userId: string, messageId: string) {
    const message = await this.findMessageForUser(userId, messageId);

    const updated = await this.prisma.internalMessage.update({
      where: { id: message.id },
      data: this.visibilityUpdate(message, userId, {
        archived: false,
        deleted: false,
      }),
      include: this.internalMessageInclude(),
    });

    return this.mapMessage(updated, userId);
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.findMessageForUser(userId, messageId);

    const updated = await this.prisma.internalMessage.update({
      where: { id: message.id },
      data: this.visibilityUpdate(message, userId, {
        archived: false,
        deleted: true,
      }),
      include: this.internalMessageInclude(),
    });

    return this.mapMessage(updated, userId);
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

  private mailboxWhere(
    userId: string,
    box: MailboxFolder,
  ): Prisma.InternalMessageWhereInput {
    if (box === 'sent') {
      return {
        senderId: userId,
        archivedBySender: false,
        deletedBySender: false,
      };
    }

    if (box === 'archived') {
      return {
        OR: [
          {
            senderId: userId,
            archivedBySender: true,
            deletedBySender: false,
          },
          {
            recipientId: userId,
            archivedByRecipient: true,
            deletedByRecipient: false,
          },
        ],
      };
    }

    if (box === 'trash') {
      return {
        OR: [
          {
            senderId: userId,
            deletedBySender: true,
          },
          {
            recipientId: userId,
            deletedByRecipient: true,
          },
        ],
      };
    }

    return {
      recipientId: userId,
      archivedByRecipient: false,
      deletedByRecipient: false,
    };
  }

  private async findMessageForUser(userId: string, messageId: string) {
    const message = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem nao encontrada');
    }

    return message;
  }

  private visibilityUpdate(
    message: { senderId: string; recipientId: string },
    userId: string,
    visibility: { archived: boolean; deleted: boolean },
  ): Prisma.InternalMessageUpdateInput {
    const data: Prisma.InternalMessageUpdateInput = {};

    if (message.senderId === userId) {
      data.archivedBySender = visibility.archived;
      data.deletedBySender = visibility.deleted;
    }

    if (message.recipientId === userId) {
      data.archivedByRecipient = visibility.archived;
      data.deletedByRecipient = visibility.deleted;
    }

    return data;
  }

  private internalMessageInclude() {
    return {
      sender: { select: internalMessageUserSelect },
      recipient: { select: internalMessageUserSelect },
    } satisfies Prisma.InternalMessageInclude;
  }

  private mapMessage(
    message: InternalMessageWithUsers,
    currentUserId: string,
  ): InternalEmailDto {
    const isRecipient = message.recipientId === currentUserId;

    return {
      id: message.id,
      from: message.sender.name,
      to: message.recipient.name,
      senderId: message.senderId,
      recipientId: message.recipientId,
      subject: message.subject,
      preview: this.preview(message.body),
      body: message.body,
      priority: message.priority,
      unread: isRecipient && !message.readAt,
      sentAt: message.createdAt,
      readAt: message.readAt,
    };
  }

  private preview(body: string) {
    const normalized = body.replace(/\s+/g, ' ').trim();

    if (normalized.length <= 120) {
      return normalized;
    }

    return `${normalized.slice(0, 117)}...`;
  }
}
