import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingTableType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePricingTableDto {
  @ApiProperty({ example: 'CBHPM 2017' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ enum: PricingTableType, default: PricingTableType.OWN })
  @IsEnum(PricingTableType)
  @IsOptional()
  type?: PricingTableType;

  @ApiPropertyOptional({ example: 2017 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 'CBHPM-2017' })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Tabela CBHPM utilizada para faturamento.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
