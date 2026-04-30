import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateCbhpmRangeDto {
  @ApiPropertyOptional({ example: 2004, default: 2004 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  startYear?: number = 2004;

  @ApiPropertyOptional({ example: 2017, default: 2017 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  endYear?: number = 2017;
}
