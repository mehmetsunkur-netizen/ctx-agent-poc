import { AgentError } from "@isara-ctx/agent-framework";

export type SearchBackendType = "chroma" | "http";

export interface SearchBackendConfig {
  type: SearchBackendType;
  chromaHost?: string;
  chromaPort?: string;
  apiUrl?: string;
  timeout?: number;
}

export function loadSearchBackendConfig(): SearchBackendConfig {
  const type = (process.env.SEARCH_BACKEND || "chroma") as SearchBackendType;

  if (type !== "chroma" && type !== "http") {
    throw new AgentError(
      `Invalid SEARCH_BACKEND value: "${type}". Must be "chroma" or "http".`
    );
  }

  const config: SearchBackendConfig = { type };

  if (type === "chroma") {
    config.chromaHost = process.env.CHROMA_HOST || "localhost";
    config.chromaPort = process.env.CHROMA_PORT || "8000";
  } else if (type === "http") {
    config.apiUrl = process.env.SEARCH_API_URL;
    if (!config.apiUrl) {
      throw new AgentError(
        'SEARCH_API_URL environment variable is required when SEARCH_BACKEND="http"'
      );
    }

    const timeoutStr = process.env.SEARCH_TIMEOUT_MS;
    if (timeoutStr) {
      const timeout = parseInt(timeoutStr, 10);
      if (isNaN(timeout) || timeout <= 0) {
        throw new AgentError(
          `Invalid SEARCH_TIMEOUT_MS value: "${timeoutStr}". Must be a positive integer.`
        );
      }
      config.timeout = timeout;
    }
  }

  console.log(`[SearchBackend] Using backend: ${type}`);

  // Log default source if set
  const defaultSource = process.env.DEFAULT_SOURCE;
  if (defaultSource) {
    console.log(`[SearchBackend] Default source: ${defaultSource}`);
  } else {
    console.log(`[SearchBackend] Default source: org-data (hardcoded fallback)`);
  }

  return config;
}
