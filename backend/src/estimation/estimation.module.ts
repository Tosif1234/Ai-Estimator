import { Module } from '@nestjs/common';

import { EstimationService } from './estimation.service.js';
import { EstimationController } from './estimation.controller.js';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AiModule } from '../ai/ai.module.js';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AiModule,
  ],
  providers: [
    EstimationService,
    ProjectAccessGuard,
    RolesGuard,
  ],
  exports: [
    EstimationService,
  ],
  controllers: [
    EstimationController,
  ],
})
export class EstimationModule {}