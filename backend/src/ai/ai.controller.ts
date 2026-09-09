import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AiService } from './ai.service.js';
import { AnalyzeRequirementDto } from './dto/analyze-requirement.dto.js';
import { GenerateRequirementDraftDto } from './dto/generate-requirement-draft.dto.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeRequirementDto) {
    return this.aiService.analyzeRequirement(dto.rawText);
  }

  @Post('generate-draft')
  generateDraft(@Body() dto: GenerateRequirementDraftDto) {
    return this.aiService.generateRequirementDraft(dto.roughText || dto.rawText || '');
  }
}