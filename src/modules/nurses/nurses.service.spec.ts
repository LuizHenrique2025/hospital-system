import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NursesService } from './nurses.service';

describe('NursesService', () => {
  let service: NursesService;

  const mockPrismaService = {
    nurse: {},
    user: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NursesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NursesService>(NursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
