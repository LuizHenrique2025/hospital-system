import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentTemplateType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryDocumentTemplateDto {
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
    example: 'atestado',
    description: 'Busca por codigo, nome, descricao, grupo, layout ou conteudo',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: DocumentTemplateType })
  @IsEnum(DocumentTemplateType)
  @IsOptional()
  type?: DocumentTemplateType;

  @ApiPropertyOptional({ example: 'ATESTADOS' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value === true || value === 'true' || value === '1';
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
