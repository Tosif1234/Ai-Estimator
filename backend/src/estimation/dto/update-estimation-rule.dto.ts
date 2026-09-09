import { PartialType } from '@nestjs/mapped-types';

import { CreateEstimationRuleDto } from './create-estimation-rule.dto.js';

export class UpdateEstimationRuleDto extends PartialType(
  CreateEstimationRuleDto,
) {}