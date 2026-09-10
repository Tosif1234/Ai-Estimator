import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EstimationController } from './estimation.controller.js';
import { EstimationService } from './estimation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

describe('EstimationController', () => {
  let controller: EstimationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimationController],
      providers: [
        { provide: EstimationService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EstimationController>(EstimationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
