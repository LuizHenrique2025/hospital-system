// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findAuthUserByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('fake-jwt-token'),
    verify: jest.fn(),
    options: {},
    logger: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: JwtService,
          useValue: mockJwtService as unknown as JwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a user', async () => {
    mockUsersService.createUser.mockResolvedValue({ id: '1', name: 'Test' });
    const result = await service.register({
      name: 'Test',
      email: 'test@example.com',
      password: '123456',
      role: 'ADMIN',
    });
    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(mockUsersService.createUser).toHaveBeenCalled();
  });

  it('should login a user and return token', async () => {
    const hashedPassword = await bcrypt.hash('123456', 10);
    mockUsersService.findAuthUserByEmail.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'ADMIN',
    });
    const result = await service.login({
      email: 'test@example.com',
      password: '123456',
    });
    expect(result).toHaveProperty('access_token');
    expect(mockJwtService.sign).toHaveBeenCalled();
  });
});
