import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AiService } from '../../ai/ai.service.js';

@Injectable()
export class GapAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async analyzeGaps(projectId: string, answers?: { question: string; answer: string }[]) {
    console.log('\n[REANALYSIS DEBUG] analyzeGaps triggered');
    console.log('[REANALYSIS DEBUG] projectId:', projectId);
    console.log('[REANALYSIS DEBUG] answers count:', answers?.length);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requirements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const requirement = project.requirements[0];
    if (!requirement) throw new NotFoundException('No requirement found for this project');
    if (!requirement.analysis) throw new NotFoundException('Requirement has not been analyzed yet');

    const existingOpenGaps = await this.prisma.requirementGap.findMany({
      where: { requirementId: requirement.id, status: 'OPEN' },
      select: { id: true, title: true, description: true, priority: true }
    });

    console.log('[REANALYSIS DEBUG] existingOpenGaps before AI:', existingOpenGaps);
    console.log('[REANALYSIS DEBUG] completenessScore before AI:', requirement.completenessScore);

    const existingQuestions = await this.prisma.requirementQuestion.findMany({
      where: { requirementId: requirement.id },
      select: { id: true, question: true, status: true, answer: true }
    });

    const gapAnalysis = await this.aiService.analyzeGaps(
      requirement.rawText,
      requirement.analysis,
      answers,
      existingOpenGaps,
      existingQuestions
    );

    console.log('[REANALYSIS DEBUG] AI Response resolvedGapIds:', gapAnalysis?.resolvedGapIds);
    console.log('[REANALYSIS DEBUG] AI Response unresolvedGapIds:', gapAnalysis?.unresolvedGapIds);
    console.log('[REANALYSIS DEBUG] AI Response newGaps:', gapAnalysis?.newGaps);

    const validOpenGapIds = new Set(existingOpenGaps.map(g => g.id));
    
    // Safety Correction 1 & 2: validate AI returned IDs against actual existing OPEN gaps
    const safeResolvedGapIds = (gapAnalysis?.resolvedGapIds || []).filter(id => validOpenGapIds.has(id));

    // Update resolved gaps
    if (safeResolvedGapIds.length > 0) {
      await this.prisma.requirementGap.updateMany({
        where: { id: { in: safeResolvedGapIds } },
        data: { status: 'RESOLVED' }
      });
    }

    // Safety Correction 3: Prevent duplicate new gaps by checking title similarity
    const allExistingGaps = await this.prisma.requirementGap.findMany({
      where: { requirementId: requirement.id },
      select: { title: true, moduleName: true }
    });
    
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s\W]+/g, ' ');
    const existingTitles = new Set(allExistingGaps.map(g => normalize(g.title)));

    const genuinelyNewGaps = (gapAnalysis?.newGaps || []).filter(newGap => {
      return !existingTitles.has(normalize(newGap.title));
    });

    await Promise.all(
      genuinelyNewGaps.map((gap) =>
        this.prisma.requirementGap.create({
          data: {
            requirementId: requirement.id,
            title: gap.title,
            description: gap.description,
            priority: gap.priority as any,
            moduleName: gap.moduleName,
            impact: gap.impact,
            status: 'OPEN'
          },
        }),
      ),
    );

    // Safety Correction 4: Recalculate completeness from ALL persisted gaps
    const allCurrentGaps = await this.prisma.requirementGap.findMany({
      where: { requirementId: requirement.id }
    });

    const completenessScore = this.calculateCompletenessScore(allCurrentGaps);

    console.log('[REANALYSIS DEBUG] AFTER allCurrentGaps count:', allCurrentGaps.length);
    console.log('[REANALYSIS DEBUG] AFTER open gaps count:', allCurrentGaps.filter(g => g.status === 'OPEN').length);
    console.log('[REANALYSIS DEBUG] AFTER completenessScore:', completenessScore);

    await this.prisma.requirement.update({
      where: { id: requirement.id },
      data: { completenessScore },
    });

    return {
      requirementId: requirement.id,
      completenessScore,
      gaps: allCurrentGaps,
    };
  }

  private calculateCompletenessScore(
    gaps: {
      priority: string;
      status: string;
    }[],
  ): number {
    if (gaps.length === 0) {
      return 100;
    }

    let deduction = 0;

    for (const gap of gaps) {
      if (gap.status === 'RESOLVED') {
        continue;
      }

      switch (gap.priority) {
        case 'CRITICAL':
          deduction += 25;
          break;

        case 'HIGH':
          deduction += 15;
          break;

        case 'MEDIUM':
          deduction += 8;
          break;

        case 'LOW':
          deduction += 3;
          break;
      }
    }

    return Math.max(0, 100 - deduction);
  }
  async recalculateCompletenessScore(requirementId: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: {
        id: requirementId,
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const gaps = await this.prisma.requirementGap.findMany({
      where: {
        requirementId,
      },
      select: {
        priority: true,
        status: true,
      },
    });

    const completenessScore = this.calculateCompletenessScore(gaps);

    const updatedRequirement = await this.prisma.requirement.update({
      where: {
        id: requirementId,
      },
      data: {
        completenessScore,
      },
      select: {
        id: true,
        completenessScore: true,
      },
    });

    return updatedRequirement;
  }

  async findAll(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requirements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    const requirement = project.requirements[0];
    if (!requirement) return [];

    return this.prisma.requirementGap.findMany({
      where: { requirementId: requirement.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getReadiness(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requirements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project || !project.requirements[0]) {
      return {
        status: 'NOT_STARTED',
        completenessScore: 0,
        openCriticalGaps: 0,
        openHighGaps: 0,
        openQuestions: 0,
      };
    }
    
    const requirement = project.requirements[0];

    const [gaps, pendingQuestions, latestEstimate] = await Promise.all([
      this.prisma.requirementGap.findMany({
        where: { requirementId: requirement.id },
      }),
      this.prisma.requirementQuestion.findMany({
        where: { requirementId: requirement.id, status: 'PENDING' },
      }),
      this.prisma.estimate.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      }),
    ]);

    const openCriticalGaps = gaps.filter((g) => g.priority === 'CRITICAL' && g.status === 'OPEN').length;
    const openHighGaps = gaps.filter((g) => g.priority === 'HIGH' && g.status === 'OPEN').length;
    const openQuestions = pendingQuestions.length;
    const criticalGapsOpen = openCriticalGaps > 0;
    
    let status = 'NEEDS_CLARIFICATION';
    if (!criticalGapsOpen && requirement.completenessScore && requirement.completenessScore >= 80) {
      status = 'READY_FOR_ESTIMATION';
    }

    if (status === 'READY_FOR_ESTIMATION' && latestEstimate) {
      const reqTime = requirement.updatedAt ? new Date(requirement.updatedAt).getTime() : new Date(requirement.createdAt).getTime();
      const estTime = new Date(latestEstimate.createdAt).getTime();
      if (reqTime <= estTime) {
        status = 'ESTIMATED';
      }
    }

    return {
      status,
      completenessScore: requirement.completenessScore || 0,
      openCriticalGaps,
      openHighGaps,
      openQuestions,
    };
  }
}
