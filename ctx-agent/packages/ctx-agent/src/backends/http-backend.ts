import { AgentError } from "@isara-ctx/agent-framework";
import { SearchBackend, SearchParams, SearchResult, SourceListItem } from "./search-backend";
import { ChromaRecord } from "../tools/chroma-tool";

interface HttpSearchResponse {
  results: Array<{
    id: string;
    document: string;
    metadata: {
      source_doc_uid?: string;
      source?: string;
      path?: string;
    };
    source?: string;
    distance?: number;
    score?: number;
  }>;
}

export class HttpSearchBackend implements SearchBackend {
  readonly name = "http";

  constructor(
    private baseUrl: string,
    private timeout: number = 30000
  ) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const start = Date.now();

    // Fallback chain: explicit param → env var → default "org-data"
    const source = params.source || process.env.DEFAULT_SOURCE || "org-data";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/search?sources=${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: params.query,
          nResults: params.nResults || 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as HttpSearchResponse;
      const end = Date.now();

      // Transform HTTP flat array to ChromaRecord format
      const records: ChromaRecord[] = data.results.map((result) => ({
        id: result.id,
        sourceDocUid: result.metadata?.source_doc_uid,
        source: result.metadata?.source || result.source,
        path: result.metadata?.path,
        document: result.document,
      }));

      return {
        records,
        latency: `${(end - start).toFixed(2)} ms`,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AgentError(
          `Search request timed out after ${this.timeout}ms`,
          error
        );
      }
      throw new AgentError(
        `HTTP search failed for source "${source}": ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async listSources(): Promise<SourceListItem[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/sources-list`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as SourceListItem[];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AgentError(
          `Request to list sources timed out after 5000ms`,
          error
        );
      }
      throw new AgentError(
        `Failed to fetch sources list from ${this.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }
  }

  async healthCheck(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }
    } catch (error) {
      throw new AgentError(
        `Cannot connect to HTTP search backend at ${this.baseUrl}.\n` +
        `Ensure the search service is running and accessible.\n` +
        `Check SEARCH_API_URL environment variable.`,
        error
      );
    }
  }
}
