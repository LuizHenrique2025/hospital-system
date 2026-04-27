import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Login do usuario',
    example: 'joao.silva',
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Login deve usar apenas letras, numeros, ponto, hifen ou underline',
  })
  username: string;

  @ApiProperty({
    description: 'Senha do usuario',
    example: 'senha123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}
