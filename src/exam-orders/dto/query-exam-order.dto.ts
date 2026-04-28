import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExamOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryExamOrderDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  @ApiPropertyOptional({
    example: 'luiz vitamina',
    description: 'Busca por paciente, CPF, medico, procedimento ou observacao',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: ExamOrderStatus })
  @IsEnum(ExamOrderStatus)
  @IsOptional()
  status?: ExamOrderStatus;

  @ApiPropertyOptional({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ example: 'doctor-uuid-here' })
  @IsUUID()
  @IsOptional()
  requesterDoctorId?: string;
}
