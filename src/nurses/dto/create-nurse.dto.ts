import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateNurseDto {
  @ApiProperty({
    example: 'user-uuid-here',
    description: 'ID do usuario com role ENFERMEIRO',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  coren: string;

  @ApiProperty({ example: 'SC', description: 'UF do COREN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve conter 2 letras maiusculas' })
  corenUf: string;

  @ApiPropertyOptional({
    example: 'sector-uuid-here',
    description: 'ID do setor vinculado ao profissional',
  })
  @IsUUID()
  @IsOptional()
  sectorId?: string;

  @ApiPropertyOptional({ example: 'Noturno' })
  @IsString()
  @IsOptional()
  shift?: string;

  @ApiPropertyOptional({ example: '47999990001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua do Hospital, 45' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Itajai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'SC' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '88300-000' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({
    example: ['coren.pdf', 'contrato-plantao.pdf'],
    description: 'Referencias de documentos vinculados ao profissional',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];
}
