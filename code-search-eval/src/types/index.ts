import { z } from 'zod';

/**
 * Difficulty levels for evaluation questions
 */
export type Difficulty = 'Easy' | 'Moderate' | 'Moderate-Advanced' | 'Advanced' | 'Expert';

/**
 * Agent types for evaluation
 */
export type AgentType = 'code-search' | 'codex' | 'claude';

/**
 * Question schema
 */
export const QuestionSchema = z.object({
  id: z.number().int().min(1),
  difficulty: z.enum(['Easy', 'Moderate', 'Moderate-Advanced', 'Advanced', 'Expert']),
  category: z.string().min(1),
  question: z.string().min(10),
  requiredFiles: z.array(z.string().min(1)).min(1),
  keywords: z.array(z.string().min(1)).min(1),
  answer: z.string().min(20),
});

export type Question = z.infer<typeof QuestionSchema>;

/**
 * Evaluation dataset schema
 */
export const EvaluationDatasetSchema = z.object({
  $schema: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+$/),
  schemaVersion: z.literal('fixed'),
  repo_path: z.string().min(1),
  repo_git_url: z.string().url().optional(),
  totalQuestions: z.number().int().min(1),
  coverageAreas: z.array(z.string()).min(1).optional(),
  evaluationNotes: z.string().optional(),
  questions: z.array(QuestionSchema).min(1),
});

export type EvaluationDataset = z.infer<typeof EvaluationDatasetSchema>;

/**
 * Metrics for a single question result
 */
export interface Metrics {
  fileCoverage: number; // 0-1
  keywordCoverage: number; // 0-1
  semanticQuality: number; // 0-1
  overall: number; // 0-100
  passed: boolean;
}

/**
 * Result from running a single question
 */
export interface QuestionResult {
  questionId: number;
  success: boolean;
  answer?: string;
  error?: string;
  metrics?: Metrics;
  score: number; // 0-100
  duration: number; // seconds
  extractedFiles?: string[]; // Files extracted from answer via LLM
}

/**
 * Aggregated metrics across all questions
 */
export interface AggregateMetrics {
  overall: number; // Average overall score (0-100)
  fileCoverage: number; // Average file coverage (0-1)
  keywordCoverage: number; // Average keyword coverage (0-1)
  semanticQuality: number; // Average semantic quality (0-1)
  passRate: number; // Percentage of questions that passed (0-1)
  totalQuestions: number;
  passedQuestions: number;
  failedQuestions: number;
  erroredQuestions: number;
}

/**
 * Complete evaluation run result
 */
export interface EvaluationRun {
  id: string;
  timestamp: string; // ISO 8601
  dataset: string; // Dataset title
  datasetVersion: string;
  repoPath: string;
  results: QuestionResult[];
  metrics: AggregateMetrics;
  config: ScorerConfig;
}

/**
 * Scorer configuration
 */
export interface ScorerConfig {
  method: 'hybrid';
  weights: {
    fileCoverage: number;
    keywordCoverage: number;
    semanticQuality: number;
  };
  passThreshold: number;
  llmJudge: {
    enabled: boolean;
    model: string;
    temperature: number;
  };
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  type: AgentType;
  llm: {
    model: string;
    apiKey?: string;
  };
  maxPlanSize: number; // Used by code-search only
  maxStepIterations: number; // Used by code-search only
}

/**
 * Runner configuration
 */
export interface RunnerConfig {
  timeout: number; // milliseconds
}

/**
 * Reporter configuration
 */
export interface ReporterConfig {
  outputDir: string;
}

/**
 * Complete evaluation configuration
 */
export interface EvaluationConfig {
  scorer: ScorerConfig;
  agent: AgentConfig;
  runner: RunnerConfig;
  reporter: ReporterConfig;
}
