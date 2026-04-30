import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const mailboxFolders = ['inbox', 'sent', 'archived', 'trash'] as const;

export type MailboxFolder = (typeof mailboxFolders)[number];

export class QueryInternalMessagesDto {
  @ApiPropertyOptional({
    enum: mailboxFolders,
    default: 'inbox',
  })
  @IsOptional()
  @IsIn(mailboxFolders)
  box?: MailboxFolder = 'inbox';
}
