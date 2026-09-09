import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(query?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = query?.search?.trim();
    const sortBy = query?.sortBy?.trim();
    const sortOrder: 'asc' | 'desc' = query?.sortOrder === 'asc' ? 'asc' : 'desc';

    const validSortFields: Record<string, string> = {
      name: 'name',
      email: 'email',
      role: 'role',
      createdAt: 'createdAt',
    };
    const orderField = validSortFields[sortBy || ''] || 'createdAt';
    const orderBy = { [orderField]: sortOrder };

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      );
      const upperSearch = search.toUpperCase();
      if (upperSearch === 'ADMIN' || upperSearch === 'CLIENT') {
        searchConditions.push({ role: upperSearch as any });
      }
    }

    const where = searchConditions.length > 0 ? { OR: searchConditions } : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy,
    });
  }

  async createUser(data: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateUser(id: string, data: any, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('You cannot edit your own profile here');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {
      name: data.name,
      role: data.role,
    };

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictException('Email already in use');
      updateData.email = data.email;
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    if ((data.role && data.role !== user.role) || data.password) {
      await this.prisma.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async deleteUser(id: string, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('You cannot delete your own profile');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async getStats() {
    const [
      totalClients,
      totalProjects,
      totalRequirements,
      totalEstimates,
      projectsNeedingClarification,
      projectsReadyForEstimation,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
      this.prisma.project.count(),
      this.prisma.requirement.count(),
      this.prisma.estimate.count(),
      this.prisma.project.count({ where: { status: 'NEEDS_CLARIFICATION' } }),
      this.prisma.project.count({ where: { status: 'READY_FOR_ESTIMATION' } }),
    ]);

    return {
      totalClients,
      totalProjects,
      totalRequirements,
      totalEstimates,
      projectsNeedingClarification,
      projectsReadyForEstimation,
    };
  }

  async getEstimates(query?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = query?.search?.trim();
    const sortBy = query?.sortBy?.trim();
    const sortOrder: 'asc' | 'desc' = query?.sortOrder === 'asc' ? 'asc' : 'desc';

    const validSortFields: Record<string, string> = {
      createdAt: 'createdAt',
      totalHours: 'totalHours',
      version: 'version',
    };
    const orderField = validSortFields[sortBy || ''] || 'createdAt';
    const orderBy = { [orderField]: sortOrder };

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        { project: { name: { contains: search, mode: 'insensitive' } } },
        { project: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { project: { user: { email: { contains: search, mode: 'insensitive' } } } },
      );
    }

    const where = searchConditions.length > 0 ? { OR: searchConditions } : {};

    return this.prisma.estimate.findMany({
      where,
      orderBy,
      include: {
        project: {
          select: {
            name: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });
  }
}
