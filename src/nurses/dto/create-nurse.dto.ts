import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateNurseDto {
  @ApiProperty({
    example: 'user-uuid-here',
    description: 'ID do usuário com role ENFERMEIRO',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  coren: string;

  @ApiProperty({ example: 'MG', description: 'UF do COREN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve conter 2 letras maiúsculas' })
  corenUf: string;

  @ApiPropertyOptional({ example: 'UTI' })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({ example: 'Noturno' })
  @IsString()
  @IsOptional()
  shift?: string;

  @ApiPropertyOptional({ example: '31987654321' })
  @IsString()
  @IsOptional()
  phone?: string;
}
