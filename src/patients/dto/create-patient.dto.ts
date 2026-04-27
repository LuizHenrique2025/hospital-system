import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  Matches,
  MinLength,
} from 'class-validator';
import { Gender, BloodType, PatientStatus } from '@prisma/client';

export class CreatePatientDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: '12345678900' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf: string;

  @ApiPropertyOptional({ example: 'MG1234567' })
  @IsString()
  @IsOptional()
  rg?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ enum: Gender, example: 'MASCULINO' })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiPropertyOptional({ enum: BloodType, example: 'O_POSITIVO' })
  @IsEnum(BloodType)
  @IsOptional()
  bloodType?: BloodType;

  @ApiProperty({ example: '31987654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Belo Horizonte' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'MG' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '30130100' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'Maria da Silva' })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiPropertyOptional({ example: '31987654322' })
  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @ApiPropertyOptional({ example: 'Alergia a penicilina' })
  @IsString()
  @IsOptional()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Hipertensão controlada' })
  @IsString()
  @IsOptional()
  medicalHistory?: string;

  @ApiPropertyOptional({ enum: PatientStatus, example: 'ACTIVE' })
  @IsEnum(PatientStatus)
  @IsOptional()
  status?: PatientStatus;

  @ApiPropertyOptional({ example: 'Cadastro bloqueado por documento pendente' })
  @IsString()
  @IsOptional()
  blockReason?: string;

  @ApiPropertyOptional({
    example: ['Documento de identidade', 'Comprovante de endereco'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];
}
