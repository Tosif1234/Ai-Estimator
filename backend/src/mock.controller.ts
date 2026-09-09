import { Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller('mock')
export class MockController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('estimate/:projectId')
  async createMockEstimate(@Param('projectId') projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { error: 'Project not found' };

    await this.prisma.estimate.create({
      data: {
          projectId: project.id,
          version: 1,
          totalHours: 120,
          totalCost: 12000,
          assumptions: ['Testing assumptions'],
          timelineWeeks: 4,
          teamSize: 2,
          modules: [
              {
                  name: "Auth",
                  hours: 40,
                  features: [{ name: "Login", hours: 20 }, { name: "Register", hours: 20 }]
              },
              {
                  name: "Dashboard",
                  hours: 80,
                  features: [{ name: "View Profile", hours: 40 }, { name: "Edit Profile", hours: 40 }]
              }
          ]
      }
    });
    return { success: true };
  }
}
