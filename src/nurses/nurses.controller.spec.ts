import { Test, TestingModule } from '@nestjs/testing';
import { NursesController } from './nurses.controller';
import { NursesService } from './nurses.service';

describe('NursesController', () => {
  let controller: NursesController;

  const mockNursesService = {
    createNurse: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUserId: jest.fn(),
    updateNurse: jest.fn(),
    deleteNurse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NursesController],
      providers: [{ provide: NursesService, useValue: mockNursesService }],
    }).compile();

    controller = module.get<NursesController>(NursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
