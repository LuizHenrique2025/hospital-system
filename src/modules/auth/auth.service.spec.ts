import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    createUser: jest.fn(),
    findAuthUserByUsername: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };
  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('fake-jwt-token');
    mockConfigService.get.mockReturnValue(undefined);
    mockPrismaService.refreshToken.create.mockResolvedValue({
      id: 'refresh-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register an attendant user', async () => {
    mockUsersService.createUser.mockResolvedValue({
      id: 'user-1',
      name: 'Ana Silva',
      username: 'ana',
      email: 'ana@example.com',
      role: Role.ATENDENTE,
    });

    const result = await service.register({
      name: 'Ana Silva',
      username: 'ana',
      email: 'ana@example.com',
      password: 'secret123',
    });

    expect(result).toEqual(
      expect.objectContaining({ id: 'user-1', role: Role.ATENDENTE }),
    );
    expect(mockUsersService.createUser).toHaveBeenCalledWith({
      name: 'Ana Silva',
      username: 'ana',
      email: 'ana@example.com',
      password: 'secret123',
      role: Role.ATENDENTE,
    });
  });

  it('should login with valid credentials and sign a role payload', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 4);
    mockUsersService.findAuthUserByUsername.mockResolvedValue({
      id: 'user-1',
      username: 'ana',
      password: hashedPassword,
      role: Role.ADMIN,
      active: true,
    });

    const result = await service.login({
      username: 'ana',
      password: 'secret123',
    });

    expect(result).toEqual({
      access_token: 'fake-jwt-token',
      refresh_token: expect.any(String),
    });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      role: Role.ADMIN,
    });
    expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('should reject login when the username does not exist', async () => {
    mockUsersService.findAuthUserByUsername.mockResolvedValue(null);

    await expect(
      service.login({ username: 'missing', password: 'secret123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });

  it('should reject login when the password is invalid', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 4);
    mockUsersService.findAuthUserByUsername.mockResolvedValue({
      id: 'user-1',
      username: 'ana',
      password: hashedPassword,
      role: Role.ADMIN,
      active: true,
    });

    await expect(
      service.login({ username: 'ana', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });

  it('should reject login when the user is inactive', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 4);
    mockUsersService.findAuthUserByUsername.mockResolvedValue({
      id: 'user-1',
      username: 'ana',
      password: hashedPassword,
      role: Role.ADMIN,
      active: false,
    });

    await expect(
      service.login({ username: 'ana', password: 'secret123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockJwtService.sign).not.toHaveBeenCalled();
  });

  it('should rotate a valid refresh token', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        role: Role.ADMIN,
        active: true,
      },
    });
    mockPrismaService.refreshToken.update.mockResolvedValue({});

    const result = await service.refresh('a'.repeat(32));

    expect(result).toEqual({
      access_token: 'fake-jwt-token',
      refresh_token: expect.any(String),
    });
    expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refresh-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('should revoke refresh token on logout', async () => {
    mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.logout('a'.repeat(32))).resolves.toEqual({
      message: 'Sessao encerrada com sucesso',
    });
    expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.any(String),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('should return the authenticated profile', async () => {
    mockUsersService.findById.mockResolvedValue({
      id: 'user-1',
      name: 'Ana Silva',
      username: 'ana',
      email: 'ana@example.com',
      role: Role.ADMIN,
    });

    await expect(service.getProfile('user-1')).resolves.toEqual(
      expect.objectContaining({ id: 'user-1', username: 'ana' }),
    );
  });

  it('should fail profile lookup for an invalid token subject', async () => {
    mockUsersService.findById.mockResolvedValue(null);

    await expect(service.getProfile('missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
