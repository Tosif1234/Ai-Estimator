import { Test, TestingModule } from '@nestjs/testing';
import { EstimationController } from './estimation.controller.js';

describe('EstimationController', () => {
  let controller: EstimationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimationController],
    }).compile();

    controller = module.get<EstimationController>(EstimationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
