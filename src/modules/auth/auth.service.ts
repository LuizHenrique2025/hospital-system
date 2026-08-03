import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    return this.usersService.createUser({
      name: dto.name,
      username: dto.username,
      email: dto.email,
      password: dto.password,
      role: Role.ATENDENTE,
    });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findAuthUserByUsername(dto.username);

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            active: true,
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      !storedToken.user.active
    ) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(storedToken.user.id, storedToken.user.role);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { message: 'Sessao encerrada com sucesso' };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    return user;
  }

  private async issueTokens(userId: string, role: Role): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      role,
    };
    const refreshToken = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: this.resolveRefreshExpiration(),
      },
    });

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
    };
  }

  private generateRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private resolveRefreshExpiration() {
    const days = this.configService.get<number>('jwt.refreshExpiresInDays') ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    return expiresAt;
  }
}
