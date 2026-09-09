import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { GapAnalysisService } from './gap-analysis.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from '../../projects/guards/project-access.guard.js';

@Controller('projects/:projectId/gap-analysis')
export class GapAnalysisController {
  constructor(
    private readonly gapAnalysisService: GapAnalysisService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  analyze(@Param('projectId') projectId: string) {
    return this.gapAnalysisService.analyzeGaps(projectId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  findAll(@Param('projectId') projectId: string) {
    return this.gapAnalysisService.findAll(projectId);
  }

  @Get('readiness')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  getReadiness(@Param('projectId') projectId: string) {
    return this.gapAnalysisService.getReadiness(projectId);
  }

}
