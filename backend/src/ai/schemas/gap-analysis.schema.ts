import { z } from 'zod';

export const GapAnalysisSchema = z.object({
  resolvedGapIds: z.array(z.string()).optional(),
  unresolvedGapIds: z.array(z.string()).optional(),
  newGaps: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      moduleName: z.string().nullable(),
      impact: z.string().nullable(),
    }),
  ).optional(),
});

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;