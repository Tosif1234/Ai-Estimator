import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminCreateUserDto, AdminUpdateUserDto } from './dto/admin-user.dto.js';

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

  async createUser(data: AdminCreateUserDto) {
    const email = data.email?.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        email,
        name: typeof data.name === 'string' ? data.name.trim() : data.name,
        password: hashedPassword,
        role: data.role,
        tokenVersion: 1,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateUser(id: string, data: AdminUpdateUserDto, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('You cannot edit your own profile here');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    if (data.role !== undefined) updateData.role = data.role;

    if (data.email) {
      const email = data.email.trim().toLowerCase();
      if (email !== user.email.toLowerCase()) {
        const existing = await this.prisma.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            NOT: { id },
          },
        });
        if (existing) throw new ConflictException('Email already in use');
        updateData.email = email;
      }
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const isSecuritySensitiveChange = (data.role && data.role !== user.role) || Boolean(data.password);

    if (isSecuritySensitiveChange) {
      updateData.tokenVersion = { increment: 1 };

      const [updatedUser] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id },
          data: updateData,
          select: { id: true, email: true, name: true, role: true, createdAt: true },
        }),
        this.prisma.refreshSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      return updatedUser;
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

    await this.prisma.$transaction([
      this.prisma.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.user.delete({ where: { id } }),
    ]);

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
