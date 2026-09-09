import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  BadGatewayException,
  ServiceUnavailableException
} from '@nestjs/common';

import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

import { RequirementAnalysisSchema } from './schemas/requirement-analysis.schema.js';
import { GapAnalysisSchema } from './schemas/gap-analysis.schema.js';
import { QuestionAnalysisSchema } from './schemas/question-analysis.schema.js';
import { UpdatedRequirementAnalysisSchema } from './schemas/updated-requirement-analysis.schema.js';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async analyzeRequirement(rawText: string) {
    if (!rawText?.trim()) {
      throw new BadRequestException('Requirement text is required');
    }

    try {
      const prompt = `
You are a senior software requirements analyst.

Analyze the client's rough project requirement below.

Extract only information that is explicitly mentioned or reasonably implied.

Do NOT estimate development hours.
Do NOT invent unnecessary features.

Identify:

- Project type
- Platforms
- User types / actors
- Major modules (include core functional modules as well as any explicitly defined Optional Add-On, Future Scope, or Out-of-Scope modules, preserving designations such as "(Optional)", "(Future Phase)", or "(Out of Scope)" on feature names or module names where indicated)
- Features inside each module
- External integrations
- Assumptions

If something is unknown, return an empty array.

Client requirement:

${rawText}
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,

        config: {
          responseMimeType: 'application/json',

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              projectType: {
                type: Type.STRING,
              },

              platforms: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              actors: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              modules: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    name: {
                      type: Type.STRING,
                    },

                    features: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },
                  },

                  required: ['name', 'features'],
                },
              },

              integrations: {
                type: Type.ARRAY,

                items: {
                  type: Type.STRING,
                },
              },

              assumptions: {
                type: Type.ARRAY,

                items: {
                  type: Type.STRING,
                },
              },
            },

            required: [
              'projectType',
              'platforms',
              'actors',
              'modules',
              'integrations',
              'assumptions',
            ],
          },
        },
      });

      const text = response.text;

      if (!text?.trim()) {
        throw new InternalServerErrorException('AI returned an empty response');
      }

      console.log('AI RAW RESPONSE:', text);

      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        throw new InternalServerErrorException('AI returned invalid JSON');
      }

      return RequirementAnalysisSchema.parse(parsed);
    } catch (error) {
      console.error('AI ERROR:', error);
      this.handleAiError(error);
    }
  }

  async generateRequirementDraft(roughText: string): Promise<{ draft: string }> {
    if (!roughText?.trim()) {
      throw new BadRequestException('Requirement text is required to generate a draft.');
    }

    try {
      const prompt = `
You are a senior software business analyst and technical requirements architect.

The client has entered a rough, unstructured or high-level idea for a software project:
"""
${roughText.trim()}
"""

Your task is to convert this rough idea into a clear, professional, well-structured software requirements document that can be used directly for engineering scope analysis and estimation.

STRICT INSTRUCTIONS:
1. STRICT GROUNDING: Stay strictly grounded in the client's provided concept and domain. Preserve the client's actual intent.
2. NO INVENTED COMMITMENTS: Do NOT invent confirmed features, external integrations, specific platforms, or rigid business logic that the client never mentioned.
3. HANDLE MISSING OR AMBIGUOUS DETAILS AS CLARIFICATIONS: If important information is missing, ambiguous, or needs client confirmation, phrase it explicitly under a "Clarifications & Open Questions" section rather than assuming or inventing decisions.
4. PROFESSIONAL STRUCTURE: Produce a clean, structured document suitable for downstream AI analysis, gap detection, and estimation.

STRUCTURE TO PRODUCE:
# Project Scope & Requirements Specification

## 1. Executive Summary & Vision
A clear summary of what the software is, the core problem it solves, and the intended value proposition.

## 2. Target Users & Roles
The distinct user personas or actors interacting with the system (e.g. End Users, Administrators, Staff) based on client context.

## 3. Functional Modules & Feature Breakdown
Organized into logical functional modules with descriptive bullet points detailing the expected capabilities.

## 4. Platform & System Architecture
Target deployment platforms (Web, Mobile, Cloud) as indicated by the client, or marked as needing clarification.

## 5. Integrations & External Services
Any third-party APIs, payment gateways, messaging services, or hardware mentioned, or marked as to-be-clarified.

## 6. Business Rules & Operational Constraints
Key workflows, security requirements, data privacy, or constraints mentioned or implied.

## 7. Out-of-Scope & Optional Add-On Capabilities
Explicitly identify any features, modules, or capabilities that are out-of-scope for the MVP, marked as optional add-ons, or deferred to future phases (e.g. Phase 2) based on client input. Clearly label each item with (Optional), (Out of Scope), or (Future Phase). If none were indicated by the client, state "None explicitly identified at this stage."

## 8. Clarifications & Open Questions
Specific decisions, requirements, or scope boundaries that need client input before finalizing technical implementation.

Format your output as clean, professional text with clear markdown headers. Do NOT include conversational filler before or after the document (e.g. do not say "Here is your requirement document:"). Output only the requirements document directly.
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      });

      const draft = response.text?.trim();
      if (!draft) {
        throw new InternalServerErrorException('AI returned an empty requirement draft.');
      }

      return { draft };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('AI DRAFT ERROR:', error);
      throw new InternalServerErrorException('Failed to generate requirement draft with AI. Please try again.');
    }
  }

  async analyzeGaps(
    rawText: string,
    analysis: unknown,
    answers?: { question: string; answer: string }[],
    existingOpenGaps?: { id: string; title: string; description: string; priority: string }[],
    existingQuestions?: { id: string; question: string; status: string; answer: string | null }[]
  ) {
    if (!rawText?.trim()) {
      throw new BadRequestException('Requirement text is required');
    }

    try {
      const prompt = `
You are a senior software requirements analyst.

Analyze the client's requirement, its existing structured analysis, and their answers to clarification questions.

Your task is to:
1. Evaluate the currently OPEN gaps to determine if the client's answers resolve them.
2. Identify ONLY ENTIRELY NEW meaningful information gaps.

Only identify a new gap when the current requirement and supplied clarification answers genuinely leave a material requirement decision unresolved. Do not create a new gap merely because the wording can be made more specific.
Do NOT invent problems.
Do NOT estimate development hours.
Do NOT flag something as a gap if the clarification answers already resolve it.

Priority rules for new gaps:
CRITICAL: Fundamentally changes scope, architecture, or major functionality.
HIGH: Significantly affects implementation.
MEDIUM: Affects implementation details.
LOW: Minor clarification.

CLIENT REQUIREMENT:

${rawText}

EXISTING STRUCTURED ANALYSIS:

${JSON.stringify(analysis, null, 2)}
${
  answers?.length
    ? `
CLARIFICATION ANSWERS ALREADY PROVIDED BY CLIENT:

${answers.map((a) => `Question: ${a.question}\nAnswer: ${a.answer}`).join('\n\n')}
`
    : ''
}
${
  existingOpenGaps?.length
    ? `
CURRENTLY OPEN GAPS (Evaluate if these are resolved by the answers):

${existingOpenGaps.map((g) => `ID: ${g.id}\nTitle: ${g.title}\nDescription: ${g.description}`).join('\n\n')}
`
    : 'CURRENTLY OPEN GAPS: None'
}
${
  existingQuestions?.length
    ? `
EXISTING CLARIFICATION QUESTIONS:

${existingQuestions.map((q) => `ID: ${q.id}\nQuestion: ${q.question}\nStatus: ${q.status}\nAnswer: ${q.answer || 'N/A'}`).join('\n\n')}
`
    : 'EXISTING CLARIFICATION QUESTIONS: None'
}
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,

        config: {
          responseMimeType: 'application/json',

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              resolvedGapIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Array of gap IDs that have been explicitly resolved by the client answers.',
              },
              unresolvedGapIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Array of gap IDs that are still open and not fully resolved.',
              },
              newGaps: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },

                    priority: {
                      type: Type.STRING,

                      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                    },

                    moduleName: {
                      type: Type.STRING,
                      nullable: true,
                    },

                    impact: {
                      type: Type.STRING,
                      nullable: true,
                    },
                  },

                  required: [
                    'title',
                    'description',
                    'priority',
                    'moduleName',
                    'impact',
                  ],
                },
              },
            },

            required: ['resolvedGapIds', 'unresolvedGapIds', 'newGaps'],
          },
        },
      });

      const text = response.text;

      if (!text?.trim()) {
        throw new InternalServerErrorException('AI returned an empty response');
      }

      console.log('AI GAP RAW RESPONSE:', text);

      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        throw new InternalServerErrorException('AI returned invalid JSON');
      }

      return GapAnalysisSchema.parse(parsed);
    } catch (error) {
      console.error('AI GAP ERROR:', error);
      this.handleAiError(error);
    }
  }
  async generateQuestions(
    gaps: {
      id: string;
      title: string;
      description: string;
      priority: string;
      moduleName: string | null;
      impact: string | null;
    }[],
    existingQuestions?: {
      id: string;
      question: string;
      status: string;
      answer: string | null;
    }[]
  ) {
    if (!gaps.length) {
      return {
        questions: [],
      };
    }

    try {
      const prompt = `
You are a senior software requirements analyst.

Generate clarification questions for the unresolved requirement gaps below.

Your goal is to ask the CLIENT questions that will provide missing
information required for:

- accurate project scope
- architecture decisions
- development estimation
- security
- business rules
- integrations
- user permissions

Rules:

1. Generate only useful clarification questions.
2. Do NOT ask questions when the gap already contains enough information.
3. Do NOT invent requirements.
4. Do NOT ask about development hours.
5. Prefer specific questions over vague questions.
6. Generate 1 to 3 questions per gap depending on its complexity.
7. Preserve the priority of the gap unless a different priority is clearly justified.
8. Each question MUST reference the exact gapId provided.
9. Never invent or modify gapId values.
10. If a gap is already sufficiently clear, do not generate a question for it.
11. CRITICAL: Do not ask for information that has already been answered, skipped, or is already covered by an existing pending question.
12. ALWAYS generate 2-4 concise, realistic suggested answer options for each question. The FIRST option (index 0) MUST ALWAYS be the recommended industry best practice or standard architectural choice for this project.
13. Options must be mutually useful, concrete technical choices. Do not use generic filler like "Option 1" or "Yes/No" unless the question genuinely calls for a boolean.
14. Ensure options are distinct and provide clear trade-offs.

GAPS:

${JSON.stringify(gaps, null, 2)}

${
  existingQuestions?.length
    ? `
EXISTING QUESTIONS (DO NOT REPEAT THESE):

${existingQuestions.map((q) => `ID: ${q.id}\nQuestion: ${q.question}\nStatus: ${q.status}\nAnswer: ${q.answer || 'N/A'}`).join('\n\n')}
`
    : 'EXISTING QUESTIONS: None'
}
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,

        config: {
          responseMimeType: 'application/json',

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              questions: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    question: {
                      type: Type.STRING,
                    },

                    priority: {
                      type: Type.STRING,
                      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                    },

                    moduleName: {
                      type: Type.STRING,
                      nullable: true,
                    },

                    gapId: {
                      type: Type.STRING,
                    },
                    
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.STRING,
                      },
                    },
                    
                    allowCustomAnswer: {
                      type: Type.BOOLEAN,
                    },
                  },

                  required: ['question', 'priority', 'moduleName', 'gapId'],
                },
              },
            },

            required: ['questions'],
          },
        },
      });

      const text = response.text;

      if (!text?.trim()) {
        throw new InternalServerErrorException('AI returned an empty response');
      }

      console.log('AI QUESTIONS RAW RESPONSE:', text);

      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        throw new InternalServerErrorException('AI returned invalid JSON');
      }

      return QuestionAnalysisSchema.parse(parsed);
    } catch (error) {
      console.error('AI QUESTION ERROR:', error);
      this.handleAiError(error);
    }
  }
  async reanalyzeRequirement(
    rawText: string,
    currentAnalysis: unknown,
    answers: {
      question: string;
      answer: string;
    }[],
  ) {
    if (!rawText?.trim()) {
      throw new BadRequestException('Requirement text is required');
    }

    if (!answers.length) {
      throw new BadRequestException('No answered questions found');
    }

    try {
      const prompt = `
You are a senior software requirements analyst.

Your task is to update an existing structured software requirement analysis
using authoritative client answers.

The client answers are FINAL CLARIFICATIONS.
They MUST be incorporated into the updated analysis.

IMPORTANT RULES:

1. Preserve all existing valid information.
2. Treat explicit client answers as authoritative facts.
3. Every answered question must be reflected in the appropriate analysis field.
4. NEVER ignore an explicit client decision.
5. If the client defines user roles, add ALL explicitly defined roles to "actors".
6. If the client specifies a platform, put it in "platforms".
7. If the client specifies an integration/provider, put it in "integrations".
8. If the client defines functionality, add it to the appropriate module/features.
9. If the client explicitly chooses one option over another, do not keep the rejected option as an assumption.
10. Remove or update assumptions that are contradicted by client answers.
11. Do NOT invent requirements.
12. Do NOT estimate development hours.
13. Do NOT add questions or answers to the output.
14. Return ONLY the updated structured requirement analysis.
15. If a field has no known information, return an empty array.
16. Keep the output consistent with the original requirement and all confirmed answers.

ANSWER INTERPRETATION:

For every client answer:

- Identify what decision/fact the answer establishes.
- Update the corresponding field in the analysis.
- Do not merely acknowledge the answer.
- The resulting JSON MUST contain the confirmed information.

Example:

Question:
"What user roles need to be supported?"

Answer:
"Admin and Client."

Then:

actors MUST contain:
["Admin", "Client"]

Example:

Question:
"Which platform is required?"

Answer:
"Responsive web application."

Then:

platforms MUST contain:
["Web"]

Example:

Question:
"Which AI provider will be used?"

Answer:
"Google Gemini only."

Then:

integrations MUST contain:
["Google Gemini API"]

ORIGINAL REQUIREMENT:

${rawText}

CURRENT ANALYSIS:

${JSON.stringify(currentAnalysis, null, 2)}

CLIENT ANSWERS:

${JSON.stringify(answers, null, 2)}

Return the updated analysis containing:

- Project type
- Platforms
- User types / actors
- Major modules
- Features inside each module
- External integrations
- Assumptions
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,

        config: {
          responseMimeType: 'application/json',

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              projectType: {
                type: Type.STRING,
              },

              platforms: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              actors: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              modules: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,

                  properties: {
                    name: {
                      type: Type.STRING,
                    },

                    features: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.STRING,
                      },
                    },
                  },

                  required: ['name', 'features'],
                },
              },

              integrations: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              assumptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
            },

            required: [
              'projectType',
              'platforms',
              'actors',
              'modules',
              'integrations',
              'assumptions',
            ],
          },
        },
      });

      const text = response.text;

      if (!text?.trim()) {
        throw new InternalServerErrorException('AI returned an empty response');
      }

      console.log('AI UPDATED ANALYSIS RESPONSE:', text);

      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        throw new InternalServerErrorException('AI returned invalid JSON');
      }

      return UpdatedRequirementAnalysisSchema.parse(parsed);
    } catch (error) {
      console.error('AI RE-ANALYSIS ERROR:', error);
      this.handleAiError(error);
    }
  }

  private handleAiError(error: any) {
    if (error instanceof BadRequestException || error instanceof BadGatewayException || error instanceof ServiceUnavailableException || error instanceof InternalServerErrorException) {
      throw error;
    }
    
    const message = error?.message?.toLowerCase() || '';
    if (message.includes('timeout') || message.includes('503')) {
      throw new ServiceUnavailableException('AI provider unavailable or timed out. Please try again.');
    }
    if (message.includes('401') || message.includes('403') || message.includes('api key')) {
      throw new InternalServerErrorException('AI provider authentication failed.');
    }
    if (message.includes('400')) {
      throw new BadRequestException('AI provider rejected the request as invalid.');
    }

    throw new BadGatewayException('AI analysis failed unexpectedly. Please try again later.');
  }

  async enrichEstimateFeatures(
    features: { moduleName: string; featureName: string; needsEstimation: boolean; baseHours?: number; category?: string; complexity?: string }[],
    requirementText: string,
    analysis: unknown
  ) {
    if (!features.length) return [];
    try {
      const prompt = `
You are an expert software development estimator and analyst.
Your task is to enrich the given list of software features with detailed, professional descriptions and, where needed, estimate development hours, category, and complexity.

IMPORTANT RULES:
1. For EVERY feature, provide a 1-3 sentence professional description explaining what the feature does, what major functionality it includes, and how it behaves based on the requirement context. Do not use generic marketing filler.
2. If "needsEstimation" is true for a feature, you MUST also provide a realistic estimate of development hours (integer), a category, and complexity (LOW, MEDIUM, HIGH).
3. If "needsEstimation" is false, you MUST STILL return the object with the provided baseHours, category, and complexity unchanged. Just add the description.
4. If a feature belongs to an optional/future module, is marked optional or out-of-scope, or represents optional add-on capability, preserve this distinction in its category (e.g. "Optional Add-Ons", "Future Scope", or parent module) and clearly articulate in the description that this is an optional or add-on capability.

REQUIREMENT CONTEXT:
${requirementText}

ANALYSIS CONTEXT:
${JSON.stringify(analysis, null, 2)}

FEATURES TO ENRICH:
${JSON.stringify(features, null, 2)}
`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                featureName: { type: Type.STRING },
                description: { type: Type.STRING },
                hours: { type: Type.INTEGER },
                category: { type: Type.STRING },
                complexity: { type: Type.STRING }
              },
              required: ['featureName', 'description', 'hours', 'category', 'complexity']
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || '[]');
      
      const EnrichedFeatureSchema = z.array(z.object({
        featureName: z.string().min(1),
        description: z.string().min(1),
        hours: z.number().min(0),
        category: z.string().min(1).default("Uncategorized"),
        complexity: z.string().min(1).default("MEDIUM")
      })).min(features.length);

      return EnrichedFeatureSchema.parse(parsed);
    } catch (error) {
      console.error('AI ENRICH ESTIMATE ERROR:', error);
      throw new InternalServerErrorException('Unable to enrich estimate details. Please try again.');
    }
  }

  async generateSubtasks(
    featureName: string,
    featureDescription: string,
    parentHours: number,
    requirementText: string,
    moduleName: string,
  ) {
    try {
      const prompt = `
You are an expert software development estimator.

Break the following software feature into concrete development subtasks.

RULES (STRICT):
1. Generate between 3 and 7 subtasks.
2. Each subtask must have a short name (3–6 words), a concise 1–2 sentence description of the actual work involved, and an integer hour estimate.
3. The sum of all subtask hours MUST EXACTLY EQUAL ${parentHours}. Do not exceed or fall short of this total.
4. Subtask hours must be positive integers (minimum 1 each).
5. Descriptions must be specific and grounded in the feature and requirement. Do NOT use generic filler like "Implement this as needed."
6. Do not invent unrelated features. Stay strictly within the scope of the parent feature.

PARENT FEATURE: ${featureName}
MODULE: ${moduleName}
FEATURE DESCRIPTION: ${featureDescription}
TOTAL HOURS TO ALLOCATE: ${parentHours}

PROJECT REQUIREMENT CONTEXT:
${requirementText.substring(0, 2000)}
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                hours: { type: Type.INTEGER },
              },
              required: ['name', 'description', 'hours'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');

      const SubtaskSchema = z.array(
        z.object({
          name: z.string().min(1),
          description: z.string().min(1),
          hours: z.number().int().min(1),
        }),
      ).min(1);

      const subtasks = SubtaskSchema.parse(parsed);

      // Enforce exact hour sum — redistribute any rounding remainder to the largest subtask
      const rawSum = subtasks.reduce((s, t) => s + t.hours, 0);
      if (rawSum !== parentHours) {
        const diff = parentHours - rawSum;
        const maxIdx = subtasks.reduce((mi, t, i, arr) => t.hours > arr[mi].hours ? i : mi, 0);
        subtasks[maxIdx].hours = Math.max(1, subtasks[maxIdx].hours + diff);
      }

      return subtasks;
    } catch (error) {
      console.error('AI SUBTASK ERROR:', error);
      throw new InternalServerErrorException('Unable to generate subtasks. Please try again.');
    }
  }
}
