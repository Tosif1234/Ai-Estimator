import { IsOptional, IsString } from 'class-validator';

import { Transform } from 'class-transformer';

export class UpdateProjectDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
