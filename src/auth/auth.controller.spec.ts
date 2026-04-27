// src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call register', async () => {
    mockAuthService.register.mockResolvedValue({ id: '1', name: 'Test' });
    const result = await controller.register({
      name: 'Test',
      username: 'test',
      email: 'test@example.com',
      password: '123456',
      role: 'ADMIN',
    });
    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(mockAuthService.register).toHaveBeenCalledWith({
      name: 'Test',
      username: 'test',
      email: 'test@example.com',
      password: '123456',
      role: 'ADMIN',
    });
  });

  it('should call login', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'token' });
    const result = await controller.login({
      username: 'test',
      password: '123456',
    });
    expect(result).toEqual({ access_token: 'token' });
    expect(mockAuthService.login).toHaveBeenCalledWith({
      username: 'test',
      password: '123456',
    });
  });
});
