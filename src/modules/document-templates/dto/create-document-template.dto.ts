import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentTemplateType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentTemplateDto {
  @ApiProperty({ example: 'DOC-ATESTADO-MEDICO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code: string;

  @ApiProperty({ example: 'ATESTADO MEDICO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name: string;

  @ApiPropertyOptional({ example: 'Atestado padrao A4.' })
  @IsString()
  @IsOptional()
  @MaxLength(240)
  description?: string;

  @ApiProperty({ example: 'ATESTADOS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  group: string;

  @ApiPropertyOptional({ example: 'PADRAO A4' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  layout?: string;

  @ApiPropertyOptional({
    enum: DocumentTemplateType,
    default: DocumentTemplateType.DOCUMENT,
  })
  @IsEnum(DocumentTemplateType)
  @IsOptional()
  type?: DocumentTemplateType;

  @ApiProperty({
    example:
      'Paciente: (#NOMEPACIENTE#)\\nCPF: (#CPFPACIENTE#)\\n(#PRESCRICAO#)',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    example: ['#NOMEPACIENTE#', '#CPFPACIENTE#', '#PRESCRICAO#'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
