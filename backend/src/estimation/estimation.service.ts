import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { CreateEstimationRuleDto } from './dto/create-estimation-rule.dto.js';
import { UpdateEstimationRuleDto } from './dto/update-estimation-rule.dto.js';

@Injectable()
export class EstimationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) { }

  private normalizeFeature(featureName: string): string {
    return featureName
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  async findRule(featureName: string) {
    const normalizedFeature = this.normalizeFeature(featureName);

    const rules = await this.prisma.estimationRule.findMany();

    const rule = rules.find((rule) => {
      const normalizedRuleName = this.normalizeFeature(rule.featureName);

      const normalizedAliases = rule.aliases.map((alias) =>
        this.normalizeFeature(alias),
      );

      return (
        normalizedRuleName === normalizedFeature ||
        normalizedAliases.includes(normalizedFeature)
      );
    });

    return rule ?? null;
  }
  async generateEstimate(projectId: string) {
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
    if (!requirement.analysis) throw new BadRequestException('Requirement analysis is required before generating an estimate.');

    const openCriticalGaps = await this.prisma.requirementGap.count({
      where: { requirementId: requirement.id, status: 'OPEN', priority: 'CRITICAL' },
    });

    if (openCriticalGaps > 0) {
      throw new BadRequestException(`Estimation is blocked. Resolve ${openCriticalGaps} critical requirement gap(s) first.`);
    }

    const analysis = requirement.analysis as {
      modules?: { name: string; features: string[] }[];
    };

    if (!analysis.modules || !analysis.modules.length) {
      throw new BadRequestException('Estimate could not be generated because no estimable features were found.');
    }

    const featuresToEnrich: {
      moduleName: string;
      featureName: string;
      needsEstimation: boolean;
      baseHours?: number;
      category?: string;
      complexity?: string;
      ruleId?: string;
    }[] = [];

    let featureCount = 0;

    for (const module of analysis.modules) {
      if (!module.features || !module.features.length) continue;
      for (const feature of module.features) {
        if (!feature.trim()) continue;
        featureCount++;
        featuresToEnrich.push({
          moduleName: module.name.trim(),
          featureName: feature.trim(),
          needsEstimation: true,
        });
      }
    }

    if (featureCount === 0) {
      throw new BadRequestException('Estimate could not be generated because no valid estimable features were found.');
    }

    const enrichedData = await this.aiService.enrichEstimateFeatures(featuresToEnrich, requirement.rawText, requirement.analysis);

    let totalHours = 0;
    const finalItems: {
      moduleName: string;
      featureName: string;
      description: string;
      hours: number;
      category: string;
      complexity: string;
      ruleId: string | null;
    }[] = [];

    for (const enriched of enrichedData) {
      const originalFeature = featuresToEnrich.find(
        f => this.normalizeFeature(f.featureName) === this.normalizeFeature(enriched.featureName)
      );

      // Protect against AI hallucinations inserting random features
      if (!originalFeature) continue;

      const finalHours = originalFeature.needsEstimation ? enriched.hours : (originalFeature.baseHours ?? 0);
      const finalCategory = originalFeature.category || enriched.category || 'Uncategorized';
      const finalComplexity = originalFeature.complexity || enriched.complexity || 'MEDIUM';

      totalHours += finalHours;
      finalItems.push({
        moduleName: originalFeature.moduleName,
        featureName: originalFeature.featureName, // Use original normalized spelling
        description: enriched.description,
        hours: finalHours,
        category: finalCategory,
        complexity: finalComplexity,
        ruleId: originalFeature.ruleId || null,
      });
    }

    if (totalHours <= 0) {
      throw new BadRequestException('Estimate could not be generated because total calculated hours is 0.');
    }
    if (finalItems.length === 0) {
      throw new BadRequestException('Estimate could not be generated because no valid estimable features were found after enrichment.');
    }

    const estimate = await this.prisma.$transaction(async (tx) => {
      const latestEstimate = await tx.estimate.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = latestEstimate ? latestEstimate.version + 1 : 1;

      return tx.estimate.create({
        data: {
          projectId,
          version: nextVersion,
          totalHours,
          items: {
            create: finalItems.map(item => ({
              moduleName: item.moduleName,
              featureName: item.featureName,
              description: item.description,
              hours: item.hours,
              category: item.category,
              complexity: item.complexity,
              ruleId: item.ruleId,
            }))
          }
        },
        include: { items: true }
      });
    });

    const moduleHours = new Map<string, number>();
    for (const item of finalItems) {
      const current = moduleHours.get(item.moduleName) ?? 0;
      moduleHours.set(item.moduleName, current + item.hours);
    }
    const moduleSummary = Array.from(moduleHours.entries()).map(([moduleName, hours]) => ({ moduleName, totalHours: hours }));

    return {
      ...estimate,
      unmatchedFeatures: [], // Kept for backwards compatibility
      moduleSummary
    };
  }

  async generateSubtasksForItem(projectId: string, itemId: string) {
    const item = await this.prisma.estimateItem.findUnique({
      where: { id: itemId },
      include: {
        subtasks: true,
        estimate: {
          include: {
            project: {
              include: {
                requirements: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Estimate item not found');
    if (item.estimate.projectId !== projectId) throw new NotFoundException('Estimate item not found for this project');

    // Return cached subtasks if already generated
    if (item.subtasks.length > 0) {
      return item.subtasks;
    }

    const requirement = item.estimate.project.requirements[0];
    if (!requirement) throw new BadRequestException('No requirement found for this project');

    const subtasks = await this.aiService.generateSubtasks(
      item.featureName,
      item.description ?? '',
      item.hours,
      requirement.rawText,
      item.moduleName,
    );

    const created = await this.prisma.$transaction(
      subtasks.map(s =>
        this.prisma.estimateItemSubtask.create({
          data: {
            estimateItemId: item.id,
            name: s.name,
            description: s.description,
            hours: s.hours,
          },
        }),
      ),
    );

    return created;
  }

  async getEstimateHistory(projectId: string) {
    return this.prisma.estimate.findMany({
      where: {
        projectId,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        id: true,
        projectId: true,
        version: true,
        totalHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getEstimateByVersion(projectId: string, version: number) {
    const estimate = await this.prisma.estimate.findFirst({
      where: {
        projectId,
        version,
      },
      include: {
        items: true,
      },
    });

    if (!estimate) {
      throw new NotFoundException(`Estimate version ${version} not found`);
    }

    const moduleHours = new Map<string, number>();

    for (const item of estimate.items) {
      const currentHours = moduleHours.get(item.moduleName) ?? 0;

      moduleHours.set(item.moduleName, currentHours + item.hours);
    }

    const moduleSummary = Array.from(moduleHours.entries()).map(
      ([moduleName, totalHours]) => ({
        moduleName,
        totalHours,
      }),
    );

    return {
      ...estimate,
      moduleSummary,
    };
  }
  async compareEstimates(
    projectId: string,
    fromVersion: number,
    toVersion: number,
  ) {
    if (
      !Number.isInteger(fromVersion) ||
      !Number.isInteger(toVersion) ||
      fromVersion < 1 ||
      toVersion < 1
    ) {
      throw new BadRequestException('Invalid estimate versions');
    }

    if (fromVersion === toVersion) {
      throw new BadRequestException('From and to versions must be different');
    }

    const [fromEstimate, toEstimate] = await Promise.all([
      this.prisma.estimate.findFirst({
        where: {
          projectId,
          version: fromVersion,
        },
        include: {
          items: true,
        },
      }),

      this.prisma.estimate.findFirst({
        where: {
          projectId,
          version: toVersion,
        },
        include: {
          items: true,
        },
      }),
    ]);

    if (!fromEstimate) {
      throw new NotFoundException(
        `Estimate version ${fromVersion} not found`,
      );
    }

    if (!toEstimate) {
      throw new NotFoundException(
        `Estimate version ${toVersion} not found`,
      );
    }

    const fromMap = new Map(
      fromEstimate.items.map((item) => [
        `${item.moduleName}::${item.featureName}`,
        item,
      ]),
    );

    const toMap = new Map(
      toEstimate.items.map((item) => [
        `${item.moduleName}::${item.featureName}`,
        item,
      ]),
    );

    const addedFeatures: {
      moduleName: string;
      featureName: string;
      hours: number;
    }[] = [];

    const removedFeatures: {
      moduleName: string;
      featureName: string;
      hours: number;
    }[] = [];

    const changedFeatures: {
      moduleName: string;
      featureName: string;
      fromHours: number;
      toHours: number;
      differenceHours: number;
    }[] = [];

    for (const [key, item] of toMap) {
      const oldItem = fromMap.get(key);

      if (!oldItem) {
        addedFeatures.push({
          moduleName: item.moduleName,
          featureName: item.featureName,
          hours: item.hours,
        });

        continue;
      }

      if (oldItem.hours !== item.hours) {
        changedFeatures.push({
          moduleName: item.moduleName,
          featureName: item.featureName,
          fromHours: oldItem.hours,
          toHours: item.hours,
          differenceHours: item.hours - oldItem.hours,
        });
      }
    }

    for (const [key, item] of fromMap) {
      if (!toMap.has(key)) {
        removedFeatures.push({
          moduleName: item.moduleName,
          featureName: item.featureName,
          hours: item.hours,
        });
      }
    }

    return {
      fromVersion,
      toVersion,
      fromTotalHours: fromEstimate.totalHours,
      toTotalHours: toEstimate.totalHours,
      differenceHours:
        toEstimate.totalHours - fromEstimate.totalHours,
      addedFeatures,
      removedFeatures,
      changedFeatures,
    };
  }
  async createRule(dto: CreateEstimationRuleDto) {
    try {
      return await this.prisma.estimationRule.create({
        data: {
          featureName: dto.featureName,
          category: dto.category,
          complexity: dto.complexity,
          baseHours: dto.baseHours,
          aliases: dto.aliases,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Estimation rule with feature name '${dto.featureName}' already exists.`);
      }
      throw error;
    }
  }

  async getRules(query?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = query?.search?.trim();
    const sortBy = query?.sortBy?.trim();
    const sortOrder: 'asc' | 'desc' = query?.sortOrder === 'desc' ? 'desc' : 'asc';

    const validSortFields: Record<string, string> = {
      featureName: 'featureName',
      category: 'category',
      baseHours: 'baseHours',
      complexity: 'complexity',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const orderField = validSortFields[sortBy || ''] || 'featureName';
    const orderBy = { [orderField]: sortOrder };

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        { featureName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { complexity: { contains: search, mode: 'insensitive' } },
        { aliases: { has: search } },
      );
    }

    const where = searchConditions.length > 0 ? { OR: searchConditions } : {};

    return this.prisma.estimationRule.findMany({
      where,
      orderBy,
    });
  }

  async updateRule(id: string, dto: UpdateEstimationRuleDto) {
    try {
      return await this.prisma.estimationRule.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Estimation rule with feature name '${dto.featureName}' already exists.`);
      }
      throw error;
    }
  }

  async deleteRule(id: string) {
    return this.prisma.estimationRule.delete({
      where: {
        id,
      },
    });
  }
}
