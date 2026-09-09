import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { EstimationService } from './estimation.service.js';
import { CreateEstimationRuleDto } from './dto/create-estimation-rule.dto.js';
import { UpdateEstimationRuleDto } from './dto/update-estimation-rule.dto.js';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard.js';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '@prisma/client';

@Controller()
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  @Post('estimation-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createRule(@Body() dto: CreateEstimationRuleDto) {
    return this.estimationService.createRule(dto);
  }

  @Get('estimation-rules')
  @UseGuards(JwtAuthGuard)
  getRules(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.estimationService.getRules({ search, sortBy, sortOrder });
  }

  @Patch('estimation-rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateRule(@Param('id') id: string, @Body() dto: UpdateEstimationRuleDto) {
    return this.estimationService.updateRule(id, dto);
  }

  @Delete('estimation-rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteRule(@Param('id') id: string) {
    return this.estimationService.deleteRule(id);
  }

  @Post('projects/:projectId/estimate')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  estimate(@Param('projectId') projectId: string) {
    return this.estimationService.generateEstimate(projectId);
  }

  @Get('projects/:projectId/estimates')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  getEstimateHistory(@Param('projectId') projectId: string) {
    return this.estimationService.getEstimateHistory(projectId);
  }

  @Get('projects/:projectId/estimates/compare')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  compareEstimates(
    @Param('projectId') projectId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.estimationService.compareEstimates(
      projectId,
      Number(from),
      Number(to),
    );
  }

  @Get('projects/:projectId/estimates/:version')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  getEstimateByVersion(
    @Param('projectId') projectId: string,
    @Param('version') version: string,
  ) {
    return this.estimationService.getEstimateByVersion(
      projectId,
      Number(version),
    );
  }

  @Post('projects/:projectId/estimate-items/:itemId/subtasks')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  generateSubtasks(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.estimationService.generateSubtasksForItem(projectId, itemId);
  }
}
