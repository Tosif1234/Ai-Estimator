import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AiService } from '../../ai/ai.service.js';
import { GapAnalysisService } from '../gap-analysis/gap-analysis.service.js';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly gapAnalysisService: GapAnalysisService,
  ) {}

  async generateQuestions(projectId: string) {
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
      throw new NotFoundException('No requirement found for this project');
    }

    const gaps = await this.prisma.requirementGap.findMany({
      where: {
        requirementId: requirement.id,
        status: 'OPEN',
      },
      orderBy: {
        priority: 'asc',
      },
    });

    if (!gaps.length) {
      return {
        requirementId: requirement.id,
        questions: [],
        message: 'No open gaps found',
      };
    }

    const existingQuestions = await this.prisma.requirementQuestion.findMany({
      where: {
        requirementId: requirement.id,
      },
    });

    const aiResponse = await this.aiService.generateQuestions(gaps, existingQuestions);

    const validGapIds = new Set(gaps.map((gap) => gap.id));

    const questionsToCreate = aiResponse?.questions || [];
    const validQuestions = questionsToCreate.filter((question) =>
      validGapIds.has(question.gapId),
    );

    const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s\W]+/g, ' ');
    const existingNormalizedQuestions = new Set(existingQuestions.map(q => normalize(q.question)));

    const genuinelyNewQuestions = validQuestions.filter(q => {
      return !existingNormalizedQuestions.has(normalize(q.question));
    });

    const savedQuestions = await Promise.all(
      genuinelyNewQuestions.map((question) => {
        let cleanOptions = question.options || [];
        // Deduplicate case-insensitively
        const seenOptions = new Set<string>();
        cleanOptions = cleanOptions.filter(opt => {
          if (!opt || typeof opt !== 'string' || !opt.trim()) return false;
          const lower = opt.toLowerCase().trim();
          if (seenOptions.has(lower)) return false;
          seenOptions.add(lower);
          return true;
        });

        return this.prisma.requirementQuestion.create({
          data: {
            requirementId: requirement.id,
            gapId: question.gapId,
            question: question.question,
            priority: question.priority,
            moduleName: question.moduleName,
            status: 'PENDING',
            options: cleanOptions.length ? cleanOptions : undefined,
            allowCustomAnswer: question.allowCustomAnswer ?? true,
          },
        });
      }),
    );

    return {
      requirementId: requirement.id,
      questions: savedQuestions,
    };
  }
  async getQuestions(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const requirement = await this.prisma.requirement.findFirst({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!requirement) {
      throw new NotFoundException('No requirement found for this project');
    }

    return this.prisma.requirementQuestion.findMany({
      where: {
        requirementId: requirement.id,
      },
      include: {
        gap: true,
        answers: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
  async answerQuestion(projectId: string, questionId: string, answer: string) {
    const question = await this.prisma.requirementQuestion.findFirst({
      where: {
        id: questionId,
        requirement: {
          projectId,
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const cleanAnswer = answer.trim();

    if (!cleanAnswer) {
      throw new BadRequestException('Answer is required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const answerHistory = await tx.requirementAnswer.create({
        data: {
          questionId: question.id,
          answer: cleanAnswer,
        },
      });

      const updatedQuestion = await tx.requirementQuestion.update({
        where: {
          id: question.id,
        },
        data: {
          answer: cleanAnswer,
          status: 'ANSWERED',
        },
      });

      return {
        question: updatedQuestion,
        answer: answerHistory,
      };
    });
    if (question.gapId) {
      await this.resolveGap(question.gapId);
    }
    await this.gapAnalysisService.recalculateCompletenessScore(
      question.requirementId,
    );

    return result;
  }
  async skipQuestion(projectId: string, questionId: string) {
    const question = await this.prisma.requirementQuestion.findFirst({
      where: {
        id: questionId,
        requirement: {
          projectId,
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.status === 'ANSWERED') {
      throw new BadRequestException('Answered question cannot be skipped');
    }

    // If question has options, auto-select the recommended answer (first option)
    let autoAnswer: string | null = null;
    if (Array.isArray(question.options) && question.options.length > 0) {
      const firstOpt = question.options[0];
      if (typeof firstOpt === 'string' && firstOpt.trim()) {
        autoAnswer = firstOpt.trim();
      }
    }

    if (autoAnswer) {
      // Record answer history and mark as answered with recommended choice
      await this.prisma.requirementAnswer.create({
        data: {
          questionId: question.id,
          answer: autoAnswer,
        },
      });

      const updatedQuestion = await this.prisma.requirementQuestion.update({
        where: {
          id: question.id,
        },
        data: {
          answer: autoAnswer,
          status: 'ANSWERED',
        },
      });

      if (question.gapId) {
        await this.resolveGap(question.gapId);
      }
      await this.gapAnalysisService.recalculateCompletenessScore(
        question.requirementId,
      );

      return updatedQuestion;
    }

    const updatedQuestion = await this.prisma.requirementQuestion.update({
      where: {
        id: question.id,
      },
      data: {
        status: 'SKIPPED',
      },
    });

    if (question.gapId) {
      await this.resolveGap(question.gapId);
    }
    await this.gapAnalysisService.recalculateCompletenessScore(
      question.requirementId,
    );

    return updatedQuestion;
  }
  private async resolveGap(gapId: string) {
    const gap = await this.prisma.requirementGap.findUnique({
      where: {
        id: gapId,
      },
    });

    if (!gap) {
      return null;
    }

    const questions = await this.prisma.requirementQuestion.findMany({
      where: {
        gapId,
      },
      select: {
        status: true,
      },
    });

    if (questions.length === 0) {
      return gap;
    }

    const allAnswered = questions.every(
      (question) => question.status === 'ANSWERED',
    );

    const status = allAnswered ? 'RESOLVED' : 'OPEN';

    return this.prisma.requirementGap.update({
      where: {
        id: gapId,
      },
      data: {
        status,
      },
    });
  }
  async applyAnswers(projectId: string) {
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
      throw new NotFoundException('No requirement found for this project');
    }

    if (!requirement.analysis) {
      throw new BadRequestException('Requirement has not been analyzed yet');
    }

    const answeredQuestions = await this.prisma.requirementQuestion.findMany({
      where: {
        requirementId: requirement.id,
        status: 'ANSWERED',
      },
      select: {
        question: true,
        answer: true,
      },
    });

    const validAnswers = answeredQuestions.filter(
      (
        item,
      ): item is {
        question: string;
        answer: string;
      } => Boolean(item.answer?.trim()),
    );

    if (!validAnswers.length) {
      throw new BadRequestException('No answered questions found');
    }

    const updatedAnalysis = await this.aiService.reanalyzeRequirement(
      requirement.rawText,
      requirement.analysis,
      validAnswers,
    );

    const updatedRequirement = await this.prisma.requirement.update({
      where: {
        id: requirement.id,
      },
      data: {
        analysis: updatedAnalysis,
      },
    });

    const gapAnalysis = await this.gapAnalysisService.analyzeGaps(projectId, validAnswers);

    return {
      requirementId: updatedRequirement.id,
      analysis: updatedRequirement.analysis,
      answeredQuestions: validAnswers.length,
      completenessScore: gapAnalysis.completenessScore,
      gaps: gapAnalysis.gaps,
    };
  }
}
