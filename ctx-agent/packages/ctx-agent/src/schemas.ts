import {
  BaseEvaluation,
  baseEvaluationSchema,
  baseOutcomeSchema,
  baseStepSchema,
  BaseSystemEvaluation,
} from "@isara-ctx/agent-framework";
import { z } from "zod";

export const stepSchema = baseStepSchema.extend({
  description: z.string().describe("Written in first person"),
});

export type Step = z.infer<typeof stepSchema>;

export const outcomeSchema = baseOutcomeSchema.extend({
  evidence: z
    .array(z.string())
    .nullable()
    .describe(
      "The IDs or references to sources found relevant to solving the step. May include metadata like 'sourceType:location:id:author:timestamp'",
    ),
  candidateAnswers: z
    .array(z.string())
    .nullable()
    .describe("Key findings and potential insights for answering the overall user question"),
});

export type Evaluation = BaseSystemEvaluation<
  typeof stepSchema,
  typeof baseEvaluationSchema
>;

export type Outcome = z.infer<typeof outcomeSchema>;

export const answerSchema = z.object({
  answer: z
    .string()
    .describe("A comprehensive response to the question. May include summary, context, and key findings."),
  reason: z
    .string()
    .describe(
      "Explain the reasoning and synthesis behind this response based on the gathered evidence. Include organizational context (people, timeline, sources) when relevant.",
    ),
  evidence: z
    .array(z.string())
    .min(1)
    .describe(
      "The IDs or references to sources used as evidence. May include metadata like sourceType, timestamp, author, location.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence score between 0 and 1 reflecting certainty in the response. Lower scores indicate gaps or uncertainty.",
    ),
});

export type Answer = z.infer<typeof answerSchema>;

export interface CTXAgentTypes {
  step: typeof stepSchema;
  outcome: typeof outcomeSchema;
  evaluation: typeof baseEvaluationSchema;
  answer: typeof answerSchema;
}
