import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ReportData,
  ReportAnalysis,
  ReportGap,
  ReportQuestion,
  ReportModuleSummary,
} from './types/report-data.types.js';

@Injectable()
export class ReportDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getReportData(projectId: string, version?: number): Promise<ReportData> {
    const project: any = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: { select: { name: true, email: true } },
        requirements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            gaps: { orderBy: { priority: 'asc' } },
            questions: { orderBy: { createdAt: 'asc' } },
          },
        },
        estimates: {
          orderBy: { version: 'desc' },
          include: { items: { orderBy: { moduleName: 'asc' }, include: { subtasks: true } } },
        },
      } as any,
    });

    if (!project) throw new NotFoundException('Project not found');

    const requirement: any = project.requirements?.[0] ?? null;
    const allEstimates: any[] = project.estimates ?? [];

    // Determine which estimate version to use
    let estimate: any = version
      ? allEstimates.find((e: any) => e.version === version) ?? null
      : allEstimates[0] ?? null;

    if (version && !estimate) {
      throw new NotFoundException(`Estimate version ${version} not found for this project`);
    }

    // Extract and validate analysis
    let analysis: ReportAnalysis | null = null;
    if (requirement?.analysis && typeof requirement.analysis === 'object') {
      const raw = requirement.analysis as Record<string, unknown>;
      if (Array.isArray(raw['modules']) && raw['modules'].length > 0) {
        analysis = {
          projectType: typeof raw['projectType'] === 'string' ? raw['projectType'] : 'Software Application',
          platforms: Array.isArray(raw['platforms']) ? (raw['platforms'] as string[]) : [],
          actors: Array.isArray(raw['actors']) ? (raw['actors'] as string[]) : [],
          modules: (raw['modules'] as Array<{ name: string; features: string[] }>).map(m => ({
            name: m.name,
            features: Array.isArray(m.features) ? m.features : [],
          })),
          integrations: Array.isArray(raw['integrations']) ? (raw['integrations'] as string[]) : [],
          assumptions: Array.isArray(raw['assumptions']) ? (raw['assumptions'] as string[]) : [],
        };
      }
    }

    // Build gap map for question linking
    const gapMap = new Map(
      (requirement?.gaps ?? []).map((g: any) => [g.id, g.title])
    );

    const gaps: ReportGap[] = (requirement?.gaps ?? []).map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      priority: g.priority,
      status: g.status,
      moduleName: g.moduleName ?? null,
      impact: g.impact ?? null,
    }));

    const questions: ReportQuestion[] = (requirement?.questions ?? []).map((q: any) => ({
      id: q.id,
      question: q.question,
      answer: q.answer ?? null,
      status: q.status,
      priority: q.priority,
      moduleName: q.moduleName ?? null,
      gapId: q.gapId ?? null,
      gapTitle: q.gapId ? (gapMap.get(q.gapId) ?? null) : null,
    }));

    // Build module summary
    let moduleSummary: ReportModuleSummary[] = [];
    if (estimate) {
      const moduleMap = new Map<string, { hours: number; count: number }>();
      for (const item of (estimate.items ?? [])) {
        const existing = moduleMap.get(item.moduleName) ?? { hours: 0, count: 0 };
        moduleMap.set(item.moduleName, {
          hours: existing.hours + item.hours,
          count: existing.count + 1,
        });
      }
      moduleSummary = Array.from(moduleMap.entries()).map(([moduleName, data]) => ({
        moduleName,
        featureCount: data.count,
        hours: data.hours,
        percentOfTotal: estimate!.totalHours > 0
          ? Math.round((data.hours / estimate!.totalHours) * 100)
          : 0,
      }));
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description ?? null,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        clientName: project.user?.name ?? null,
        clientEmail: project.user?.email ?? '',
      },
      requirement: requirement
        ? { rawText: requirement.rawText, completenessScore: requirement.completenessScore ?? null }
        : null,
      analysis,
      gaps,
      questions,
      estimate: estimate
        ? {
            version: estimate.version,
            totalHours: estimate.totalHours,
            createdAt: estimate.createdAt,
            items: (estimate.items ?? []).map((item: any) => ({
              id: item.id,
              moduleName: item.moduleName,
              featureName: item.featureName,
              description: item.description ?? null,
              category: item.category ?? null,
              complexity: item.complexity ?? null,
              hours: item.hours,
              ruleId: item.ruleId ?? null,
              subtasks: (item as any).subtasks?.map((st: any) => ({
                name: st.name,
                description: st.description,
                hours: st.hours,
              })) ?? [],
            })),
            moduleSummary,
          }
        : null,
      estimateHistory: allEstimates.map((e: any) => ({
        version: e.version,
        totalHours: e.totalHours,
        createdAt: e.createdAt,
      })),
    };
  }
}
