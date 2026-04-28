import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAgreementPricingRuleDto {
  @ApiProperty({
    description: 'Tabela de preco usada pelo convenio',
    example: '6fc0b1f0-0378-4a30-9f66-1f565d5c0c8e',
  })
  @IsUUID()
  pricingTableId: string;

  @ApiPropertyOptional({
    description: 'Percentual aplicado sobre a tabela base. 100 = valor cheio.',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  multiplierPercent?: number = 100;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresAuthorization?: boolean = false;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ example: 'Contrato padrao do convenio' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
