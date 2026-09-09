import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { Transform } from 'class-transformer';

export class CreateProjectDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}