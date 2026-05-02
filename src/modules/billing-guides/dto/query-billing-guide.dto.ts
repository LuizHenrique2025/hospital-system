import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingGuideStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryBillingGuideDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25, default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({
    example: 'HDR-351909 Ingrid SC SAUDE',
    description:
      'Busca por guia, senha/autorizacao, paciente, CPF, convenio ou setor.',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: BillingGuideStatus })
  @IsEnum(BillingGuideStatus)
  @IsOptional()
  status?: BillingGuideStatus;

  @ApiPropertyOptional({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ example: 'appointment-uuid-here' })
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'provider-uuid-here' })
  @IsUUID()
  @IsOptional()
  providerId?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsString()
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsString()
  @IsOptional()
  createdTo?: string;
}
