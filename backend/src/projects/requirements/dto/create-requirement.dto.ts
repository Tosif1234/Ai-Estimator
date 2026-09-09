import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { Transform } from 'class-transformer';

export class CreateRequirementDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  rawText: string;
}