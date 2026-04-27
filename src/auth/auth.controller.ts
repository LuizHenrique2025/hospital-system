import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserResponseDto } from '../users/dto/user-response.dto';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Registrar novo usuario (apenas ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Usuario criado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sem permissao (apenas ADMIN)' })
  @ApiResponse({ status: 409, description: 'Login ou email ja esta em uso' })
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais invalidas' })
  async login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter perfil do usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuario',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Nao autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario nao encontrado' })
  async getProfile(
    @GetUser() user: { userId: string; role: string },
  ): Promise<UserResponseDto> {
    return this.authService.getProfile(user.userId);
  }
}
