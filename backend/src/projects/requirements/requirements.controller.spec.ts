import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsController } from './requirements.controller.js';
import { RequirementsService } from './requirements.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from '../guards/project-access.guard.js';

describe('RequirementsController', () => {
  let controller: RequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementsController],
      providers: [
        { provide: RequirementsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RequirementsController>(RequirementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
