import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateExamOrderItemDto {
  @ApiProperty({ example: 'procedure-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  procedureId: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 'Coletar pela manha' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateExamOrderDto {
  @ApiProperty({ example: 'patient-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ example: 'doctor-uuid-here' })
  @IsUUID()
  @IsOptional()
  requesterDoctorId?: string;

  @ApiPropertyOptional({ example: 'appointment-uuid-here' })
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @ApiPropertyOptional({ enum: ExamOrderStatus, default: ExamOrderStatus.REQUESTED })
  @IsEnum(ExamOrderStatus)
  @IsOptional()
  status?: ExamOrderStatus;

  @ApiPropertyOptional({ example: 'Rotina' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: 'Investigacao diagnostica inicial' })
  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @ApiPropertyOptional({ example: 'Paciente orientado sobre preparo.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateExamOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExamOrderItemDto)
  items: CreateExamOrderItemDto[];
}
