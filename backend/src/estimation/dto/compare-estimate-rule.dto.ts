import { IsInt, Min } from 'class-validator';

export class CompareEstimateDto {
  @IsInt()
  @Min(1)
  from!: number;

  @IsInt()
  @Min(1)
  to!: number;
}