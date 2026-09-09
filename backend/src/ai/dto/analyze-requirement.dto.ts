import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnalyzeRequirementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  rawText: string;
}