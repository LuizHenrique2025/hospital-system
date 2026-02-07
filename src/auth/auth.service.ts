import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    /**
     * Segurança (importante):
     * - Cadastro público NÃO deve aceitar role vindo do cliente.
     * - Role deve ser padrão (ex.: ATENDENTE ou PACIENTE).
     * - Criação de usuários com roles elevadas deve ser rota protegida (ADMIN).
     */
    const user = await this.usersService.createUser({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: Role.ATENDENTE,
    });

    // Evitar vazar hash de senha (mesmo que seja só hash)
    // Ideal: o UsersService já retornar um "safe user" (UserResponseDto).
    // Aqui garantimos na marra:
    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Evitar vazar senha no profile também
    const { password, ...safeUser } = user as any;
    return safeUser;
  }
}
