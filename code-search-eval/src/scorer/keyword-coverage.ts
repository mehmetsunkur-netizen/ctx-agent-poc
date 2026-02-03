/**
 * Score keyword coverage using simple text matching
 */
export class KeywordCoverageScorer {
  /**
   * Calculate keyword coverage score
   * Uses case-insensitive matching
   */
  scoreKeywordCoverage(answer: string, keywords: string[]): number {
    if (keywords.length === 0) {
      return 1.0; // Perfect score if no keywords required
    }

    const answerLower = answer.toLowerCase();
    let foundCount = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Check if keyword appears in answer
      // Use word boundary regex for more accurate matching
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(keywordLower)}\\b`, 'i');

      if (wordBoundaryRegex.test(answer) || answerLower.includes(keywordLower)) {
        foundCount++;
      }
    }

    return foundCount / keywords.length;
  }

  /**
   * Get detailed keyword match information
   */
  getKeywordMatches(answer: string, keywords: string[]): {
    matched: string[];
    missing: string[];
    score: number;
  } {
    const answerLower = answer.toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(keywordLower)}\\b`, 'i');

      if (wordBoundaryRegex.test(answer) || answerLower.includes(keywordLower)) {
        matched.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    const score = keywords.length > 0 ? matched.length / keywords.length : 1.0;

    return { matched, missing, score };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
