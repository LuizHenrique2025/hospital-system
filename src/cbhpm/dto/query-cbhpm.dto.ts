import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryCbhpmDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 30;

  @ApiPropertyOptional({ example: '10101012 consulta' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: 2005 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @IsOptional()
  editionYear?: number;
}
