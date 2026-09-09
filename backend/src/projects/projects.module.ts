import { Module } from '@nestjs/common';

import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { RequirementsModule } from './requirements/requirements.module.js';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

import { ProjectAccessGuard } from './guards/project-access.guard.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RequirementsModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectAccessGuard,
  ],
})
export class ProjectsModule {}