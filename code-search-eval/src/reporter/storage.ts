import { mkdir, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';

/**
 * Handle file storage for evaluation results
 */
export class ResultStorage {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Save content to a file
   */
  async save(
    runId: string,
    format: 'json' | 'md',
    content: string
  ): Promise<string> {
    const extension = format === 'json' ? 'json' : 'md';
    const filename = `${runId}.${extension}`;
    const filepath = resolve(this.outputDir, filename);

    // Ensure directory exists
    await mkdir(dirname(filepath), { recursive: true });

    // Write file
    await writeFile(filepath, content, 'utf-8');

    return filepath;
  }

  /**
   * Save as latest (creates both <runId>.ext and latest.ext)
   */
  async saveAsLatest(
    runId: string,
    format: 'json' | 'md',
    content: string
  ): Promise<{ runPath: string; latestPath: string }> {
    const runPath = await this.save(runId, format, content);

    // Also save as "latest"
    const extension = format === 'json' ? 'json' : 'md';
    const latestPath = resolve(this.outputDir, `latest.${extension}`);
    await writeFile(latestPath, content, 'utf-8');

    return { runPath, latestPath };
  }
}
