import { Test, TestingModule } from '@nestjs/testing';
import { NursesService } from './nurses.service';

describe('NursesService', () => {
  let service: NursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NursesService],
    }).compile();

    service = module.get<NursesService>(NursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
