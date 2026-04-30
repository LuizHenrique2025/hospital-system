import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('/api/auth/login (POST) rejects invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'missing-user', password: '123456' })
      .expect(401);
  });
});
