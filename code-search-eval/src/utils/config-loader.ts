import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EvaluationConfig } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load configuration from a JSON file
 */
export async function loadConfig(configPath?: string): Promise<EvaluationConfig> {
  // Use provided path or default
  const path = configPath
    ? resolve(process.cwd(), configPath)
    : resolve(__dirname, '../../config/default.json');

  try {
    const content = await readFile(path, 'utf-8');
    const config = JSON.parse(content) as EvaluationConfig;

    // Replace environment variable placeholders
    if (config.agent.llm.apiKey?.startsWith('${') && config.agent.llm.apiKey.endsWith('}')) {
      const envVar = config.agent.llm.apiKey.slice(2, -1);
      config.agent.llm.apiKey = process.env[envVar];
    }

    // Use environment variable if not set in config
    if (!config.agent.llm.apiKey) {
      config.agent.llm.apiKey = process.env.OPENAI_API_KEY;
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config from ${path}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Merge CLI flags into configuration
 */
export function mergeConfigWithFlags(
  config: EvaluationConfig,
  flags: Record<string, any>
): EvaluationConfig {
  const merged = { ...config };

  // Override output directory if provided
  if (flags.output) {
    merged.reporter.outputDir = flags.output;
  }

  return merged;
}
