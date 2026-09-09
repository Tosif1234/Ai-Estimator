import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';

import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { RequirementsService } from './requirements/requirements.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthUser } from '../auth/types/auth-user.js';
import { ProjectAccessGuard } from './guards/project-access.guard.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly requirementsService: RequirementsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Req()
    req: {
      user: AuthUser;
    },
  ) {
    return this.projectsService.create(
      createProjectDto,
      req.user.userId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post(':projectId/analyze')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  analyze(@Param('projectId') projectId: string) {
    return this.requirementsService.analyze(projectId);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req()
    req: {
      user: AuthUser;
    },
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.projectsService.findAll(req.user, { search, sortBy, sortOrder });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}