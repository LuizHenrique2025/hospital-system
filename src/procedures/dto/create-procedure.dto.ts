import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcedureType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProcedureDto {
  @ApiProperty({ example: '40302814' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 'Vitamina B6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  description: string;

  @ApiPropertyOptional({ enum: ProcedureType, default: ProcedureType.PROCEDURE })
  @IsEnum(ProcedureType)
  @IsOptional()
  type?: ProcedureType;

  @ApiPropertyOptional({ example: 'AMB' })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  tableCode?: string;

  @ApiPropertyOptional({ example: 'Laboratorio' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  groupName?: string;

  @ApiPropertyOptional({ example: 'Unidade' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({
    example: 12990,
    description: 'Valor de referencia em centavos',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  referencePriceCents?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  requiresAuthorization?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  requiresReport?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Jejum de 8 horas quando solicitado.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
