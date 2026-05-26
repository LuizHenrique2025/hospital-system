import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('fake-jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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
    });

    const result = await service.login({
      username: 'ana',
      password: 'secret123',
    });

    expect(result).toEqual({ access_token: 'fake-jwt-token' });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      role: Role.ADMIN,
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
    });

    await expect(
      service.login({ username: 'ana', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockJwtService.sign).not.toHaveBeenCalled();
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
