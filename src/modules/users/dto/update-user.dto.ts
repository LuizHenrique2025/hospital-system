import { Role } from '@prisma/client';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Login unico do usuario',
    example: 'joao.silva',
    minLength: 3,
    maxLength: 40,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Login deve usar apenas letras, numeros, ponto, hifen ou underline',
  })
  username?: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 6 caracteres)',
    example: 'novaSenha123',
    minLength: 6,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    description: 'Role do usuário',
    enum: Role,
    example: Role.MEDICO,
    required: false,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    description: 'Define se o usuario esta ativo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
