import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsController } from './requirements.controller.js';

describe('RequirementsController', () => {
  let controller: RequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementsController],
    }).compile();

    controller = module.get<RequirementsController>(RequirementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
