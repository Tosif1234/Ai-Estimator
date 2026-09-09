import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard.js';

@Controller('projects/:projectId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  async generateDefaultExcelReport(
    @Param('projectId') projectId: string,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    return this.generateReport(projectId, 'excel', version, res);
  }

  @Get(':format')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  async generateReport(
    @Param('projectId') projectId: string,
    @Param('format') format: string,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    const versionNumber = version ? parseInt(version, 10) : undefined;
    const { buffer, filename, contentType } = await this.reportsService.generateReport(
      projectId,
      format,
      versionNumber,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
