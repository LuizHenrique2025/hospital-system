import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProcedurePriceDto {
  @ApiProperty({ example: 'procedure-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  procedureId: string;

  @ApiProperty({ example: 'pricing-table-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  pricingTableId: string;

  @ApiProperty({
    example: 12990,
    description: 'Valor final em centavos para essa tabela',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiPropertyOptional({
    example: 4200,
    description: 'Custo operacional interno em centavos',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  operationalCostCents?: number;

  @ApiPropertyOptional({ example: 'Unidade, CH, UCO, taxa, pacote' })
  @IsString()
  @IsOptional()
  billingUnit?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Valor negociado com convenio X.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
