import { Module } from '@nestjs/common';

import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiModule } from '../../ai/ai.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { GapAnalysisModule } from '../gap-analysis/gap-analysis.module.js';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AuthModule,
    GapAnalysisModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}