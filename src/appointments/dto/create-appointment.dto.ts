import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'doctor-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2026-01-15T14:30:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @ApiPropertyOptional({ enum: AppointmentStatus, example: 'AGENDADA' })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: AppointmentType, example: 'PRIMEIRA_CONSULTA' })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiPropertyOptional({ example: 'Paciente com dor no peito' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Hipertensão arterial' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Losartana 50mg - 1x ao dia' })
  @IsString()
  @IsOptional()
  prescription?: string;
}
