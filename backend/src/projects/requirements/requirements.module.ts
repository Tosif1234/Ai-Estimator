import { Module } from '@nestjs/common';

import { RequirementsController } from './requirements.controller.js';
import { RequirementsService } from './requirements.service.js';

import { AiModule } from '../../ai/ai.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { GapAnalysisModule } from '../../requirements/gap-analysis/gap-analysis.module.js';
import { QuestionsModule } from '../../requirements/questions/questions.module.js';
import { ProjectAccessGuard } from '../guards/project-access.guard.js';

@Module({
  imports: [
    AiModule,
    AuthModule,
    GapAnalysisModule,
    QuestionsModule,
  ],
  controllers: [RequirementsController],
  providers: [
    RequirementsService,
    ProjectAccessGuard,
  ],
  exports: [RequirementsService],
})
export class RequirementsModule {}