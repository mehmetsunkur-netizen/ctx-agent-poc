/**
 * Code Search Agent Evaluation Module
 *
 * Programmatic evaluation system for measuring code-search agent accuracy
 * against curated question datasets with known correct answers.
 */

// Types
export * from './types/index.js';

// Loader
export { DatasetLoader } from './loader/dataset-loader.js';

// Runner
export { EvaluationRunner } from './runner/eval-runner.js';

// Scorer
export { Scorer, FileCoverageScorer, KeywordCoverageScorer, LLMJudge } from './scorer/index.js';

// Reporter
export { JSONReporter } from './reporter/json-reporter.js';
export { MarkdownReporter } from './reporter/markdown-reporter.js';
export { ResultStorage } from './reporter/storage.js';

// Utils
export { loadConfig, mergeConfigWithFlags } from './utils/config-loader.js';
