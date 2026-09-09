import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AiService } from '../../ai/ai.service.js';
import { GapAnalysisService } from '../../requirements/gap-analysis/gap-analysis.service.js';
import { QuestionsService } from '../../requirements/questions/questions.service.js';
import { CreateRequirementDto } from './dto/create-requirement.dto.js';
import { UpdateRequirementDto } from './dto/update-requirement.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly gapAnalysisService: GapAnalysisService,
    private readonly questionsService: QuestionsService,
  ) {}

  async create(
    projectId: string,
    createRequirementDto: CreateRequirementDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.requirement.create({
      data: {
        projectId,
        rawText: createRequirementDto.rawText,
      },
    });
  }

  async generateDraft(roughText: string) {
    return this.aiService.generateRequirementDraft(roughText);
  }

  async update(
  projectId: string,
  requirementId: string,
  updateRequirementDto: UpdateRequirementDto,
) {
  const requirement = await this.prisma.requirement.findFirst({
    where: {
      id: requirementId,
      projectId,
    },
  });

  if (!requirement) {
    throw new NotFoundException('Requirement not found');
  }

  return this.prisma.requirement.update({
    where: {
      id: requirementId,
    },
    data: {
      rawText: updateRequirementDto.rawText,
      analysis: Prisma.JsonNull,
    },
  });
}

  async analyze(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        requirements: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const requirement = project.requirements[0];

    if (!requirement) {
      throw new NotFoundException(
        'No requirement found for this project',
      );
    }

    const analysis = await this.aiService.analyzeRequirement(
      requirement.rawText,
    );

    const updatedRequirement =
      await this.prisma.requirement.update({
        where: {
          id: requirement.id,
        },
        data: {
          analysis,
        },
      });

    // Automatically generate gaps and questions so user gets them immediately without manual steps
    try {
      console.log(`[PIPELINE] Automatically running gap analysis for project ${projectId}...`);
      await this.gapAnalysisService.analyzeGaps(projectId);
      console.log(`[PIPELINE] Automatically generating questions for project ${projectId}...`);
      await this.questionsService.generateQuestions(projectId);
    } catch (pipelineErr) {
      console.error('[PIPELINE] Error auto-generating gaps/questions during requirement analysis:', pipelineErr);
    }

    return updatedRequirement;
  }

  async findAll(projectId: string) {
    return this.prisma.requirement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        rawText: true,
        analysis: true,
        completenessScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async extractTextFromFile(file: any): Promise<{ text: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      let text = '';
      if (file.mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
        const result = await parser.getText();
        text = result.text;
        await parser.destroy();
      } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
        text = file.buffer.toString('utf-8');
      } else {
        throw new BadRequestException('Unsupported file type. Please upload a PDF or TXT file.');
      }

      if (!text || !text.trim()) {
        throw new BadRequestException('Could not extract text from the provided file.');
      }

      return { text: text.trim() };
    } catch (error) {
      console.error('Error extracting text from file:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process the uploaded file.');
    }
  }
}