import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillingGuideMovementType,
  BillingGuideStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class MoveBillingGuideDto {
  @ApiProperty({ enum: BillingGuideStatus, example: BillingGuideStatus.GLOSA })
  @IsEnum(BillingGuideStatus)
  toStatus: BillingGuideStatus;

  @ApiPropertyOptional({
    enum: BillingGuideMovementType,
    example: BillingGuideMovementType.GLOSA_RECORDED,
  })
  @IsEnum(BillingGuideMovementType)
  @IsOptional()
  movementType?: BillingGuideMovementType;

  @ApiPropertyOptional({ example: 'Faturamento' })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({
    example: 'Divergencia entre porte CBHPM e procedimento autorizado.',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'Anexar justificativa medica.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 184320 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  amountCents?: number;

  @ApiPropertyOptional({ example: 284760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  requestedAmountCents?: number;

  @ApiPropertyOptional({ example: 255760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  authorizedAmountCents?: number;

  @ApiPropertyOptional({ example: 120000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  paidAmountCents?: number;

  @ApiPropertyOptional({ example: 84320 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  deniedAmountCents?: number;

  @ApiPropertyOptional({ example: 84320 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  appealedAmountCents?: number;

  @ApiPropertyOptional({
    example: { lote: 'XML-30042026', origem: 'Bionexo' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
