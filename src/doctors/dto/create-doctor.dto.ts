import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'ID do usuário com role MEDICO' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  crm: string;

  @ApiProperty({ example: 'MG', description: 'UF do CRM' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve conter 2 letras maiúsculas' })
  crmUf: string;

  @ApiProperty({ example: ['Cardiologia', 'Clínico Geral'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  specialties: string[];

  @ApiPropertyOptional({ example: '31987654321' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Médico com 10 anos de experiência' })
  @IsString()
  @IsOptional()
  bio?: string;
}
