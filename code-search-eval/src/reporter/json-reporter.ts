import type { EvaluationRun } from '../types/index.js';

/**
 * Generate JSON reports
 */
export class JSONReporter {
  /**
   * Generate a JSON report from an evaluation run
   */
  generate(run: EvaluationRun): string {
    return JSON.stringify(run, null, 2);
  }

  /**
   * Generate a summary JSON report (without full answers)
   */
  generateSummary(run: EvaluationRun): string {
    const summary = {
      id: run.id,
      timestamp: run.timestamp,
      dataset: run.dataset,
      datasetVersion: run.datasetVersion,
      repoPath: run.repoPath,
      metrics: run.metrics,
      config: run.config,
      results: run.results.map((r) => ({
        questionId: r.questionId,
        success: r.success,
        score: r.score,
        duration: r.duration,
        passed: r.metrics?.passed,
        error: r.error,
      })),
    };

    return JSON.stringify(summary, null, 2);
  }
}
