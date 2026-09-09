import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AnswerQuestionDto } from './dto/answer-question.dto.js';

import { QuestionsService } from './questions.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { ProjectAccessGuard } from '../../projects/guards/project-access.guard.js';

@Controller('projects/:projectId/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  generateQuestions(@Param('projectId') projectId: string) {
    return this.questionsService.generateQuestions(projectId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  getQuestions(@Param('projectId') projectId: string) {
    return this.questionsService.getQuestions(projectId);
  }

  @Patch(':questionId/answer')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  answerQuestion(
    @Param('projectId') projectId: string,
    @Param('questionId') questionId: string,
    @Body() answerQuestionDto: AnswerQuestionDto,
  ) {
    return this.questionsService.answerQuestion(
      projectId,
      questionId,
      answerQuestionDto.answer,
    );
  }

  @Patch(':questionId/skip')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  skipQuestion(
    @Param('projectId') projectId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.questionsService.skipQuestion(projectId, questionId);
  }

  @Post('apply-answers')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  applyAnswers(@Param('projectId') projectId: string) {
    return this.questionsService.applyAnswers(projectId);
  }
}
