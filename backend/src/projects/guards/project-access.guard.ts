import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthUser } from '../../auth/types/auth-user.js';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: AuthUser;
      params: {
        projectId?: string;
        id?: string;
      };
    }>();

    const projectId =
      request.params.projectId ?? request.params.id;

    if (!projectId) {
      throw new NotFoundException('Project ID is required');
    }

    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // ADMIN can access any project
    if (request.user.role === Role.ADMIN) {
      return true;
    }

    // CLIENT can access only their own project
    if (project.userId !== request.user.userId) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }

    return true;
  }
}