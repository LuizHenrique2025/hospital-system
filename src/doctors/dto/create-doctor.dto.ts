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

export class CreateDoctorDto {
  @ApiProperty({
    example: 'user-uuid-here',
    description: 'ID do usuario com role MEDICO',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  crm: string;

  @ApiProperty({ example: 'SC', description: 'UF do CRM' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve conter 2 letras maiusculas' })
  crmUf: string;

  @ApiProperty({ example: ['Cardiologia', 'Clinico Geral'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  specialties: string[];

  @ApiPropertyOptional({
    example: 'sector-uuid-here',
    description: 'ID do setor vinculado ao profissional',
  })
  @IsUUID()
  @IsOptional()
  sectorId?: string;

  @ApiPropertyOptional({ example: '47999990000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Itapema' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'SC' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '88220-000' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({
    example: ['crm.pdf', 'comprovante-endereco.pdf'],
    description: 'Referencias de documentos vinculados ao profissional',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];

  @ApiPropertyOptional({ example: 'Medico com 10 anos de experiencia' })
  @IsString()
  @IsOptional()
  bio?: string;
}
