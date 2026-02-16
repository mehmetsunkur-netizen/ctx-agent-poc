import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

/**
 * Create the standard embedding function used across code-search
 * Uses OpenAI's text-embedding-3-large model by default
 *
 * Can be configured via EMBEDDING_MODEL environment variable
 */
export function createEmbeddingFunction(): OpenAIEmbeddingFunction {
  const modelName = process.env.EMBEDDING_MODEL || "text-embedding-3-large";

  return new OpenAIEmbeddingFunction({
    modelName,
  });
}
