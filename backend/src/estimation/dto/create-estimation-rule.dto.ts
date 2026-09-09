import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEstimationRuleDto {
  @IsString()
  featureName: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  complexity?: string;

  @IsNumber()
  @Min(0)
  baseHours: number;

  @IsArray()
  @IsString({ each: true })
  aliases: string[];
}