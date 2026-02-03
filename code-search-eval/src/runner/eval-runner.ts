import { CodeSearchAgent } from '@isara-ctx/code-agent';
import { LLMProvider } from '@isara-ctx/agent-framework';
import type {
  EvaluationDataset,
  Question,
  QuestionResult,
  EvaluationRun,
  AggregateMetrics,
  EvaluationConfig,
} from '../types/index.js';
import { Scorer } from '../scorer/index.js';
import chalk from 'chalk';

/**
 * Orchestrates the evaluation process
 */
export class EvaluationRunner {
  private config: EvaluationConfig;
  private scorer: Scorer;

  constructor(config: EvaluationConfig, apiKey: string) {
    this.config = config;
    this.scorer = new Scorer(config.scorer, apiKey);
  }

  /**
   * Run evaluation on an entire dataset
   */
  async runDataset(
    dataset: EvaluationDataset,
    options: { verbose?: boolean } = {}
  ): Promise<EvaluationRun> {
    const { verbose = false } = options;

    console.log(chalk.bold(`\n🔍 Running evaluation: ${dataset.title}`));
    console.log(chalk.gray(`Repository: ${dataset.repo_path}`));
    console.log(chalk.gray(`Questions: ${dataset.totalQuestions}\n`));

    const results: QuestionResult[] = [];

    // Sequential execution
    for (const question of dataset.questions) {
      const prefix = `Q${question.id}`;
      console.log(chalk.cyan(`${prefix}: ${question.question.slice(0, 60)}...`));

      try {
        const result = await this.runQuestion(question, dataset.repo_path, verbose);
        results.push(result);

        // Display result
        const statusIcon = result.success && result.metrics?.passed ? '✓' : '✗';
        const statusColor =
          result.success && result.metrics?.passed ? chalk.green : chalk.red;
        const scoreText = result.success
          ? `${result.score.toFixed(1)}/100`
          : 'ERROR';

        console.log(statusColor(`  ${statusIcon} ${scoreText}`));

        if (verbose && result.metrics) {
          console.log(
            chalk.gray(
              `    File: ${(result.metrics.fileCoverage * 100).toFixed(0)}% | ` +
                `Keyword: ${(result.metrics.keywordCoverage * 100).toFixed(0)}% | ` +
                `Semantic: ${(result.metrics.semanticQuality * 100).toFixed(0)}%`
            )
          );
        }

        if (!result.success && verbose) {
          console.log(chalk.red(`    Error: ${result.error}`));
        }
      } catch (error) {
        // Continue on error policy
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          questionId: question.id,
          success: false,
          error: errorMessage,
          score: 0,
          duration: 0,
        });

        console.log(chalk.red(`  ✗ ERROR: ${errorMessage}`));
      }

      console.log(); // Blank line between questions
    }

    // Compute aggregate metrics
    const metrics = this.computeMetrics(results);

    // Display summary
    console.log(chalk.bold('\n📊 Results Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(
      `Overall Score:    ${this.formatScore(metrics.overall)}/100`
    );
    console.log(
      `Pass Rate:        ${chalk.bold((metrics.passRate * 100).toFixed(0) + '%')} (${metrics.passedQuestions}/${metrics.totalQuestions})`
    );
    console.log(`File Coverage:    ${(metrics.fileCoverage * 100).toFixed(0)}%`);
    console.log(
      `Keyword Coverage: ${(metrics.keywordCoverage * 100).toFixed(0)}%`
    );
    console.log(
      `Semantic Quality: ${(metrics.semanticQuality * 100).toFixed(0)}%`
    );

    if (metrics.erroredQuestions > 0) {
      console.log(
        chalk.yellow(`\n⚠ ${metrics.erroredQuestions} question(s) failed with errors`)
      );
    }

    return {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      dataset: dataset.title,
      datasetVersion: dataset.version,
      repoPath: dataset.repo_path,
      results,
      metrics,
      config: this.config.scorer,
    };
  }

  /**
   * Run a single question
   */
  private async runQuestion(
    question: Question,
    repoPath: string,
    verbose: boolean
  ): Promise<QuestionResult> {
    const startTime = Date.now();

    try {
      // Create agent for this question
      if (verbose) {
        console.log(chalk.gray(`  Creating agent...`));
      }

      const agent = await CodeSearchAgent.create({
        path: repoPath,
        llmConfig: {
          provider: LLMProvider.OpenAI,
          model: this.config.agent.llm.model,
          apiKey: this.config.agent.llm.apiKey,
        },
      });

      // Run agent with timeout
      if (verbose) {
        console.log(chalk.gray(`  Running agent...`));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.config.runner.timeout);

      const agentResult = await agent.run({
        query: question.question,
        maxPlanSize: this.config.agent.maxPlanSize,
        maxStepIterations: this.config.agent.maxStepIterations,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const answer = agentResult.answer;

      // Score result
      if (verbose) {
        console.log(chalk.gray(`  Scoring answer...`));
      }

      const { metrics, extractedFiles } = await this.scorer.score(answer, question);

      const duration = (Date.now() - startTime) / 1000;

      return {
        questionId: question.id,
        success: true,
        answer,
        metrics,
        score: metrics.overall,
        duration,
        extractedFiles,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      // Enhanced error message with stack trace if verbose
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (verbose) {
          console.error(chalk.red(`  Error details:`));
          console.error(chalk.gray(`  Message: ${error.message}`));

          // Check for cause chain
          if ('cause' in error && error.cause) {
            const cause = error.cause as Error;
            console.error(chalk.gray(`  Cause: ${cause.message}`));
            if (cause.stack) {
              console.error(chalk.gray(`  Cause stack:`));
              console.error(chalk.gray(cause.stack));
            }
          }

          if (error.stack) {
            console.error(chalk.red(`  Stack trace:`));
            console.error(chalk.gray(error.stack));
          }
        }
      }

      return {
        questionId: question.id,
        success: false,
        error: errorMessage,
        score: 0,
        duration,
      };
    }
  }

  /**
   * Compute aggregate metrics across all results
   */
  private computeMetrics(results: QuestionResult[]): AggregateMetrics {
    const successfulResults = results.filter((r) => r.success && r.metrics);

    const totalQuestions = results.length;
    const erroredQuestions = results.filter((r) => !r.success).length;
    const passedQuestions = successfulResults.filter(
      (r) => r.metrics!.passed
    ).length;
    const failedQuestions = totalQuestions - passedQuestions - erroredQuestions;

    // Calculate averages (only for successful results)
    let sumOverall = 0;
    let sumFileCoverage = 0;
    let sumKeywordCoverage = 0;
    let sumSemanticQuality = 0;

    for (const result of successfulResults) {
      if (result.metrics) {
        sumOverall += result.metrics.overall;
        sumFileCoverage += result.metrics.fileCoverage;
        sumKeywordCoverage += result.metrics.keywordCoverage;
        sumSemanticQuality += result.metrics.semanticQuality;
      }
    }

    const count = successfulResults.length || 1; // Avoid division by zero

    return {
      overall: sumOverall / count,
      fileCoverage: sumFileCoverage / count,
      keywordCoverage: sumKeywordCoverage / count,
      semanticQuality: sumSemanticQuality / count,
      passRate: passedQuestions / totalQuestions,
      totalQuestions,
      passedQuestions,
      failedQuestions,
      erroredQuestions,
    };
  }

  /**
   * Format score with color
   */
  private formatScore(score: number): string {
    const threshold = this.config.scorer.passThreshold;
    if (score >= threshold) {
      return chalk.green(score.toFixed(1));
    } else if (score >= threshold * 0.7) {
      return chalk.yellow(score.toFixed(1));
    } else {
      return chalk.red(score.toFixed(1));
    }
  }
}
