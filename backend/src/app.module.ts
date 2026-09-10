import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { RequirementsModule } from './projects/requirements/requirements.module.js';
import { AiModule } from './ai/ai.module.js';
import { EstimationModule } from './estimation/estimation.module.js';
import { AuthModule } from './auth/auth.module.js';
import { GapAnalysisModule } from './requirements/gap-analysis/gap-analysis.module.js';
import { QuestionsModule } from './requirements/questions/questions.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ReportsModule } from './reports/reports.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

import { MockController } from './mock.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    // ObserveModule.forRoot({
    //   appKey: 'YOUR_APP_KEY',
    //   appSecret: 'YOUR_APP_SECRET',
    //   serviceId: 'backend',
    // }),

    PrismaModule,
    ProjectsModule,
    RequirementsModule,
    AiModule,
    EstimationModule,
    AuthModule,
    GapAnalysisModule,
    QuestionsModule,
    AdminModule,
    ReportsModule,
  ],
  controllers: [AppController, MockController],
  providers: [AppService],
})
export class AppModule {}