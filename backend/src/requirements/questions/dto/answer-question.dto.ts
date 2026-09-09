import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnswerQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  answer: string;
}