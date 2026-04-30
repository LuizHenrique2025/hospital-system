import { ApiProperty } from '@nestjs/swagger';
import { InternalMessagePriority } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInternalMessageDto {
  @ApiProperty({
    description: 'Usuario que recebera a mensagem interna',
    example: '6fc0b1f0-0378-4a30-9f66-1f565d5c0c8e',
  })
  @IsUUID()
  recipientId: string;

  @ApiProperty({ example: 'Solicitacao de suporte' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(140)
  subject: string;

  @ApiProperty({ example: 'Favor verificar o atendimento em aberto.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(4000)
  body: string;

  @ApiProperty({
    enum: InternalMessagePriority,
    required: false,
    example: InternalMessagePriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(InternalMessagePriority)
  priority: InternalMessagePriority = InternalMessagePriority.NORMAL;
}
