import { ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetEstimateStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryBudgetEstimateDto {
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
    example: 'ORC Ingrid ultrassom',
    description: 'Busca por codigo, paciente, CPF, convenio ou procedimento.',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: BudgetEstimateStatus })
  @IsEnum(BudgetEstimateStatus)
  @IsOptional()
  status?: BudgetEstimateStatus;

  @ApiPropertyOptional({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ example: 'provider-uuid-here' })
  @IsUUID()
  @IsOptional()
  providerId?: string;
}
