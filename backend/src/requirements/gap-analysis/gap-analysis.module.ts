import { Module } from '@nestjs/common';

import { GapAnalysisService } from './gap-analysis.service.js';
import { GapAnalysisController } from './gap-analysis.controller.js';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiModule } from '../../ai/ai.module.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AuthModule,
  ],
  controllers: [GapAnalysisController],
  providers: [GapAnalysisService],
  exports: [GapAnalysisService],
})
export class GapAnalysisModule {}