import type { EvaluationRun, QuestionResult } from '../types/index.js';

/**
 * Generate Markdown reports
 */
export class MarkdownReporter {
  /**
   * Generate a Markdown report from an evaluation run
   */
  generate(run: EvaluationRun): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Evaluation Report: ${run.dataset}`);
    lines.push('');
    lines.push(`**Run ID:** ${run.id}`);
    lines.push(`**Timestamp:** ${new Date(run.timestamp).toLocaleString()}`);
    lines.push(`**Dataset Version:** ${run.datasetVersion}`);
    lines.push(`**Repository:** ${run.repoPath}`);
    lines.push('');

    // Overall Metrics
    lines.push('## Overall Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Overall Score | ${run.metrics.overall.toFixed(1)}/100 |`);
    lines.push(
      `| Pass Rate | ${(run.metrics.passRate * 100).toFixed(0)}% (${run.metrics.passedQuestions}/${run.metrics.totalQuestions}) |`
    );
    lines.push(
      `| File Coverage | ${(run.metrics.fileCoverage * 100).toFixed(0)}% |`
    );
    lines.push(
      `| Keyword Coverage | ${(run.metrics.keywordCoverage * 100).toFixed(0)}% |`
    );
    lines.push(
      `| Semantic Quality | ${(run.metrics.semanticQuality * 100).toFixed(0)}% |`
    );
    lines.push(
      `| Failed Questions | ${run.metrics.failedQuestions} |`
    );
    lines.push(
      `| Errored Questions | ${run.metrics.erroredQuestions} |`
    );
    lines.push('');

    // Configuration
    lines.push('## Configuration');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(run.config, null, 2));
    lines.push('```');
    lines.push('');

    // Question Results
    lines.push('## Question Results');
    lines.push('');

    for (const result of run.results) {
      lines.push(`### Question ${result.questionId}`);
      lines.push('');

      if (result.success && result.metrics) {
        const status = result.metrics.passed ? '✓ PASSED' : '✗ FAILED';
        const statusEmoji = result.metrics.passed ? '✓' : '✗';

        lines.push(`**Status:** ${statusEmoji} ${status}`);
        lines.push(`**Score:** ${result.score.toFixed(1)}/100`);
        lines.push(`**Duration:** ${result.duration.toFixed(2)}s`);
        lines.push('');

        lines.push('**Metrics:**');
        lines.push(
          `- File Coverage: ${(result.metrics.fileCoverage * 100).toFixed(0)}%`
        );
        lines.push(
          `- Keyword Coverage: ${(result.metrics.keywordCoverage * 100).toFixed(0)}%`
        );
        lines.push(
          `- Semantic Quality: ${(result.metrics.semanticQuality * 100).toFixed(0)}%`
        );
        lines.push('');

        if (result.extractedFiles && result.extractedFiles.length > 0) {
          lines.push('**Extracted Files:**');
          for (const file of result.extractedFiles) {
            lines.push(`- \`${file}\``);
          }
          lines.push('');
        }

        if (result.answer) {
          lines.push('<details>');
          lines.push('<summary>View Answer</summary>');
          lines.push('');
          lines.push('```');
          lines.push(result.answer);
          lines.push('```');
          lines.push('');
          lines.push('</details>');
          lines.push('');
        }
      } else {
        lines.push('**Status:** ✗ ERROR');
        lines.push(`**Error:** ${result.error || 'Unknown error'}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate a summary Markdown report (without full answers)
   */
  generateSummary(run: EvaluationRun): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Evaluation Summary: ${run.dataset}`);
    lines.push('');
    lines.push(`**Run ID:** ${run.id}`);
    lines.push(`**Timestamp:** ${new Date(run.timestamp).toLocaleString()}`);
    lines.push('');

    // Overall Metrics
    lines.push('## Overall Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Overall Score | ${run.metrics.overall.toFixed(1)}/100 |`);
    lines.push(
      `| Pass Rate | ${(run.metrics.passRate * 100).toFixed(0)}% (${run.metrics.passedQuestions}/${run.metrics.totalQuestions}) |`
    );
    lines.push('');

    // Question Summary
    lines.push('## Question Summary');
    lines.push('');
    lines.push('| Q# | Score | Status | Duration |');
    lines.push('|----|-------|--------|----------|');

    for (const result of run.results) {
      const status = result.success
        ? result.metrics?.passed
          ? '✓ Pass'
          : '✗ Fail'
        : '✗ Error';
      const score = result.success ? result.score.toFixed(1) : 'N/A';
      const duration = `${result.duration.toFixed(2)}s`;

      lines.push(`| ${result.questionId} | ${score} | ${status} | ${duration} |`);
    }

    lines.push('');

    return lines.join('\n');
  }
}
