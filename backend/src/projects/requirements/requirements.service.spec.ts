import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsService } from './requirements.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiService } from '../../ai/ai.service.js';
import { GapAnalysisService } from '../../requirements/gap-analysis/gap-analysis.service.js';
import { QuestionsService } from '../../requirements/questions/questions.service.js';

describe('RequirementsService', () => {
  let service: RequirementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        { provide: PrismaService, useValue: {} },
        { provide: AiService, useValue: {} },
        { provide: GapAnalysisService, useValue: {} },
        { provide: QuestionsService, useValue: {} },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
