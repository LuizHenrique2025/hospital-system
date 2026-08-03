import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
  })
  name: string;

  @ApiProperty({
    description: 'Login unico do usuario',
    example: 'joao.silva',
  })
  username: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Role do usuário',
    enum: Role,
    example: Role.ADMIN,
  })
  role: Role;

  @ApiProperty({
    description: 'Indica se o usuario esta ativo no sistema',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
