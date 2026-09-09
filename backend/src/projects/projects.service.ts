import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AuthUser } from '../auth/types/auth-user.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        userId,
      },
    });
  }

  private computeLiveStatus(project: {
    status?: string | null;
    requirements?: Array<{
      createdAt: Date;
      updatedAt?: Date;
      completenessScore?: number | null;
      gaps?: Array<{ priority: string; status: string }>;
    }>;
    estimates?: Array<{
      id: string;
      version: number;
      createdAt: Date;
    }>;
  }): string {
    if (project.status === 'COMPLETED') {
      return 'COMPLETED';
    }

    const latestReq = project.requirements?.[0];
    const latestEstimate = project.estimates?.[0];

    if (!latestReq) {
      return 'DRAFT';
    }

    if (latestEstimate) {
      const reqTime = latestReq.updatedAt
        ? new Date(latestReq.updatedAt).getTime()
        : new Date(latestReq.createdAt).getTime();
      const estTime = new Date(latestEstimate.createdAt).getTime();
      if (reqTime <= estTime) {
        return 'ESTIMATED';
      }
    }

    const gaps = latestReq.gaps || [];
    const openCriticalGaps = gaps.filter(
      (g) => g.priority === 'CRITICAL' && g.status === 'OPEN',
    ).length;
    const score = latestReq.completenessScore ?? 0;

    if (openCriticalGaps === 0 && score >= 80) {
      return 'READY_FOR_ESTIMATION';
    }

    return 'NEEDS_CLARIFICATION';
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        requirements: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            gaps: true,
            questions: {
              include: {
                answers: true,
              }
            },
          },
        },
        estimates: {
          orderBy: {
            version: 'desc',
          },
          select: {
            id: true,
            version: true,
            totalHours: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const liveStatus = this.computeLiveStatus(project);
    if (project.status !== liveStatus) {
      this.prisma.project.update({
        where: { id: project.id },
        data: { status: liveStatus },
      }).catch(() => {});
      project.status = liveStatus;
    }

    return project;
  }

  async findAll(user: AuthUser, query?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = query?.search?.trim();
    const sortBy = query?.sortBy?.trim();
    const sortOrder: 'asc' | 'desc' = query?.sortOrder === 'asc' ? 'asc' : 'desc';

    const validSortFields: Record<string, string> = {
      name: 'name',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const orderField = validSortFields[sortBy || ''] || 'createdAt';
    const orderBy = { [orderField]: sortOrder };

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
      );
      if (user.role === 'ADMIN') {
        searchConditions.push(
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        );
      }
    }

    const baseWhere = user.role === 'ADMIN' ? {} : { userId: user.userId };
    const where = searchConditions.length > 0
      ? { ...baseWhere, OR: searchConditions }
      : baseWhere;

    const includeRelations = {
      requirements: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        include: {
          gaps: {
            where: { status: 'OPEN' as const },
            select: { priority: true, status: true },
          },
        },
      },
      estimates: {
        orderBy: { version: 'desc' as const },
        take: 1,
        select: {
          id: true,
          version: true,
          createdAt: true,
        },
      },
    };

    let projects;
    if (user.role === 'ADMIN') {
      projects = await this.prisma.project.findMany({
        where,
        orderBy,
        include: {
          ...includeRelations,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });
    } else {
      projects = await this.prisma.project.findMany({
        where,
        orderBy,
        include: includeRelations,
      });
    }

    const result = await Promise.all(
      projects.map(async (project) => {
        const liveStatus = this.computeLiveStatus(project);
        if (project.status !== liveStatus) {
          this.prisma.project.update({
            where: { id: project.id },
            data: { status: liveStatus },
          }).catch(() => {});
          project.status = liveStatus;
        }
        return project;
      }),
    );

    if (sortBy === 'status') {
      result.sort((a, b) => {
        const diff = (a.status || '').localeCompare(b.status || '');
        return sortOrder === 'asc' ? diff : -diff;
      });
    }

    return result;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: updateProjectDto.name,
        description: updateProjectDto.description,
        status: updateProjectDto.status,
      },
    });
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
