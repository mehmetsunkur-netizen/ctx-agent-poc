import type { Question, Metrics, ScorerConfig } from '../types/index.js';
import { FileCoverageScorer } from './file-coverage.js';
import { KeywordCoverageScorer } from './keyword-coverage.js';
import { LLMJudge } from './llm-judge.js';

/**
 * Main scorer that orchestrates all scoring components
 */
export class Scorer {
  private fileCoverageScorer: FileCoverageScorer;
  private keywordCoverageScorer: KeywordCoverageScorer;
  private llmJudge: LLMJudge | null = null;
  private config: ScorerConfig;

  constructor(config: ScorerConfig, apiKey: string) {
    this.config = config;

    // Initialize file coverage scorer (uses LLM for extraction)
    this.fileCoverageScorer = new FileCoverageScorer(
      apiKey,
      config.llmJudge.model
    );

    // Initialize keyword coverage scorer
    this.keywordCoverageScorer = new KeywordCoverageScorer();

    // Initialize LLM judge if enabled
    if (config.llmJudge.enabled) {
      this.llmJudge = new LLMJudge(
        apiKey,
        config.llmJudge.model,
        config.llmJudge.temperature
      );
    }
  }

  /**
   * Score an agent's answer against expected results
   */
  async score(
    answer: string,
    question: Question
  ): Promise<{ metrics: Metrics; extractedFiles: string[] }> {
    // 1. Extract files from answer and score file coverage
    const { score: fileCoverage, extractedFiles } =
      await this.fileCoverageScorer.scoreAnswer(answer, question.requiredFiles);

    // 2. Score keyword coverage
    const keywordCoverage = this.keywordCoverageScorer.scoreKeywordCoverage(
      answer,
      question.keywords
    );

    // 3. Score semantic quality with LLM judge
    let semanticQuality = 0;
    if (this.llmJudge) {
      semanticQuality = await this.llmJudge.scoreAnswer(
        question.question,
        answer,
        question.answer
      );
    } else {
      // If LLM judge disabled, use keyword coverage as proxy
      semanticQuality = keywordCoverage;
    }

    // 4. Calculate weighted overall score (0-100 scale)
    const overall =
      this.config.weights.fileCoverage * fileCoverage +
      this.config.weights.keywordCoverage * keywordCoverage +
      this.config.weights.semanticQuality * semanticQuality;

    const overallScore = overall * 100; // Convert to 0-100 scale

    // 5. Determine pass/fail
    const passed = overallScore >= this.config.passThreshold;

    const metrics: Metrics = {
      fileCoverage,
      keywordCoverage,
      semanticQuality,
      overall: overallScore,
      passed,
    };

    return { metrics, extractedFiles };
  }

  /**
   * Get detailed scoring breakdown for analysis
   */
  async scoreWithDetails(answer: string, question: Question): Promise<{
    metrics: Metrics;
    extractedFiles: string[];
    details: {
      keywordMatches: {
        matched: string[];
        missing: string[];
      };
    };
  }> {
    const { metrics, extractedFiles } = await this.score(answer, question);

    const keywordMatches = this.keywordCoverageScorer.getKeywordMatches(
      answer,
      question.keywords
    );

    return {
      metrics,
      extractedFiles,
      details: {
        keywordMatches: {
          matched: keywordMatches.matched,
          missing: keywordMatches.missing,
        },
      },
    };
  }
}

export { FileCoverageScorer, KeywordCoverageScorer, LLMJudge };
