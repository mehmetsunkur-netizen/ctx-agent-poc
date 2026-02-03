import OpenAI from 'openai';

/**
 * Extract file paths from answer text using LLM
 */
export class FileCoverageScorer {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Use LLM to extract file paths mentioned in the answer text
   */
  async extractFilesFromAnswer(answer: string): Promise<string[]> {
    const prompt = `Extract all file paths mentioned in this text.
Return ONLY a JSON array of file paths (strings), nothing else.
If no file paths are found, return an empty array: []

Rules:
- Include complete paths when available
- Normalize paths (e.g., "./src/file.ts" → "src/file.ts")
- Include files mentioned in any format (markdown links, code blocks, plain text)
- Do not include directory paths unless specifically mentioned as files

Text:
${answer}

Example valid outputs:
["src/auth.ts", "src/types/user.ts"]
[]
["package.json"]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You extract file paths from text. Return only valid JSON arrays.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content?.trim() || '[]';

      // Parse JSON response
      try {
        const files = JSON.parse(content);
        if (!Array.isArray(files)) {
          console.warn('LLM returned non-array response, using empty array');
          return [];
        }
        return files.filter((f) => typeof f === 'string' && f.length > 0);
      } catch (parseError) {
        console.warn('Failed to parse LLM response as JSON, using empty array');
        return [];
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to extract files from answer: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Calculate file coverage score
   */
  scoreFileCoverage(extractedFiles: string[], requiredFiles: string[]): number {
    if (requiredFiles.length === 0) {
      return 1.0; // Perfect score if no files required
    }

    // Normalize paths for comparison
    const normalize = (path: string) => path.replace(/^\.\//, '').toLowerCase();
    const extractedSet = new Set(extractedFiles.map(normalize));
    const requiredSet = new Set(requiredFiles.map(normalize));

    // Count how many required files were found
    let covered = 0;
    for (const required of requiredSet) {
      if (extractedSet.has(required)) {
        covered++;
      }
    }

    return covered / requiredFiles.length;
  }

  /**
   * Extract files and score coverage in one call
   */
  async scoreAnswer(answer: string, requiredFiles: string[]): Promise<{
    score: number;
    extractedFiles: string[];
  }> {
    const extractedFiles = await this.extractFilesFromAnswer(answer);
    const score = this.scoreFileCoverage(extractedFiles, requiredFiles);

    return { score, extractedFiles };
  }
}
