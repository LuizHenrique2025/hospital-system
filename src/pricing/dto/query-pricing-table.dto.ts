import { ApiPropertyOptional } from '@nestjs/swagger';
import { PricingTableType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryPricingTableDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 25, default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 25;

  @ApiPropertyOptional({ example: 'CBHPM 2017' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: PricingTableType })
  @IsEnum(PricingTableType)
  @IsOptional()
  type?: PricingTableType;

  @ApiPropertyOptional({ example: 2017 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @IsOptional()
  year?: number;
}
