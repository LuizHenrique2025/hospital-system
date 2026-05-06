import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryAppointmentDto {
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
    example: 'luiz rotina',
    description:
      'Busca por paciente, CPF, medico, setor, diagnostico ou notas.',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiPropertyOptional({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ example: 'doctor-uuid-here' })
  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsString()
  @IsOptional()
  appointmentFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsString()
  @IsOptional()
  appointmentTo?: string;
}
