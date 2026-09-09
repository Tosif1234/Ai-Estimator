import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { RequirementsService } from './requirements.service.js';
import { CreateRequirementDto } from './dto/create-requirement.dto.js';
import { UpdateRequirementDto } from './dto/update-requirement.dto.js';
import { GenerateRequirementDraftDto } from './dto/generate-requirement-draft.dto.js';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from '../guards/project-access.guard.js';

@Controller('projects/:projectId/requirements')
export class RequirementsController {
  constructor(
    private readonly requirementsService: RequirementsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  findAll(@Param('projectId') projectId: string) {
    return this.requirementsService.findAll(projectId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  create(
    @Param('projectId') projectId: string,
    @Body() createRequirementDto: CreateRequirementDto,
  ) {
    return this.requirementsService.create(
      projectId,
      createRequirementDto,
    );
  }

  @Post('generate-draft')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  generateDraft(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateRequirementDraftDto,
  ) {
    return this.requirementsService.generateDraft(dto.roughText || dto.rawText || '');
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  analyze(@Param('projectId') projectId: string) {
    return this.requirementsService.analyze(projectId);
  }

  @Patch(':requirementId')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  update(
    @Param('projectId') projectId: string,
    @Param('requirementId') requirementId: string,
    @Body() updateRequirementDto: UpdateRequirementDto,
  ) {
    return this.requirementsService.update(
      projectId,
      requirementId,
      updateRequirementDto,
    );
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: any,
  ) {
    return this.requirementsService.extractTextFromFile(file);
  }
}