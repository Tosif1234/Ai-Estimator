import { z } from 'zod';

export const QuestionAnalysisSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),

      priority: z.enum([
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW',
      ]),

      moduleName: z.string().nullable(),

      gapId: z.string(),

      options: z.array(z.string()).optional(),
      
      allowCustomAnswer: z.boolean().default(true),
    }),
  ),
});

export type QuestionAnalysis = z.infer<
  typeof QuestionAnalysisSchema
>;