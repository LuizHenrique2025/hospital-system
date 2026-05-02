import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetEstimateStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBudgetEstimateItemDto {
  @ApiProperty({ example: 'procedure-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  procedureId: string;

  @ApiPropertyOptional({ example: 'pricing-table-uuid-here' })
  @IsUUID()
  @IsOptional()
  pricingTableId?: string;

  @ApiPropertyOptional({ example: 'procedure-price-uuid-here' })
  @IsUUID()
  @IsOptional()
  procedurePriceId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 255760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  unitPriceCents?: number;

  @ApiPropertyOptional({ example: 1100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  operationalCostCents?: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  discountCents?: number;

  @ApiPropertyOptional({ example: 'Inclui taxa de sala.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBudgetEstimateDto {
  @ApiPropertyOptional({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ example: 'provider-uuid-here' })
  @IsUUID()
  @IsOptional()
  providerId?: string;

  @ApiPropertyOptional({
    enum: BudgetEstimateStatus,
    default: BudgetEstimateStatus.DRAFT,
  })
  @IsEnum(BudgetEstimateStatus)
  @IsOptional()
  status?: BudgetEstimateStatus;

  @ApiPropertyOptional({ example: 'Orcamento exames pre-operatorios' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Paciente solicitou envio para aprovacao.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  discountCents?: number;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({ type: [CreateBudgetEstimateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetEstimateItemDto)
  items: CreateBudgetEstimateItemDto[];
}
