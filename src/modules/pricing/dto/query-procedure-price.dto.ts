import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryProcedurePriceDto {
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

  @ApiPropertyOptional({ example: 'vitamina cbhpm' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: 'procedure-uuid-here' })
  @IsUUID()
  @IsOptional()
  procedureId?: string;

  @ApiPropertyOptional({ example: 'pricing-table-uuid-here' })
  @IsUUID()
  @IsOptional()
  pricingTableId?: string;
}
