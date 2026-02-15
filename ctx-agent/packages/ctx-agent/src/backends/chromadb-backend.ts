import { Collection, ChromaClient } from "chromadb";
import { AgentError } from "@isara-ctx/agent-framework";
import { SearchBackend, SearchParams, SearchResult, SourceListItem } from "./search-backend";
import { processSearchResults, RecordMetadata } from "../tools/utils";

export class ChromaDBBackend implements SearchBackend {
  readonly name = "chromadb";

  constructor(
    private collection: Collection,
    private client?: ChromaClient
  ) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const start = Date.now();

    // For MVP: use current collection (ignoring params.source)
    // Future enhancement: switch collections based on params.source
    const results = await this.collection.query<RecordMetadata>({
      queryTexts: [params.query],
      where: params.where || { query: { $ne: true } },
      nResults: params.nResults || 5,
    });

    const end = Date.now();

    return {
      records: processSearchResults(results),
      latency: `${(end - start).toFixed(2)} ms`,
    };
  }

  async listSources(): Promise<SourceListItem[]> {
    if (!this.client) {
      throw new AgentError(
        "ChromaDB client not available. Cannot list collections."
      );
    }

    try {
      const collections = await this.client.listCollections();

      return collections.map((collection) => ({
        type: "source" as const,
        id: collection.id,
        name: collection.name,
        displayName: this.formatDisplayName(collection.name),
        collection: collection.name,
      }));
    } catch (error) {
      throw new AgentError(
        "Failed to list ChromaDB collections",
        error
      );
    }
  }

  async healthCheck(): Promise<void> {
    // No-op: health check already done in getContextEngineCollection()
  }

  /**
   * Format collection name into human-readable display name
   * e.g., "slack_messages" → "Slack Messages"
   */
  private formatDisplayName(name: string): string {
    return name
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }
}
