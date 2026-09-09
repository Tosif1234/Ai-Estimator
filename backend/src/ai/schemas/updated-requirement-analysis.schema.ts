import { z } from 'zod';

export const UpdatedRequirementAnalysisSchema = z.object({
  projectType: z.string(),

  platforms: z.array(z.string()),

  actors: z.array(z.string()),

  modules: z.array(
    z.object({
      name: z.string().min(1),
      features: z.array(z.string().min(1)).min(1),
    }),
  ).min(1),

  integrations: z.array(z.string()),

  assumptions: z.array(z.string()),
});

export type UpdatedRequirementAnalysis = z.infer<
  typeof UpdatedRequirementAnalysisSchema
>;