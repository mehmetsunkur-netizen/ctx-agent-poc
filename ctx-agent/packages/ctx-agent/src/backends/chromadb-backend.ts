import { Collection, ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { AgentError } from "@isara-ctx/agent-framework";
import { SearchBackend, SearchParams, SearchResult, SourceListItem } from "./search-backend";
import { RecordMetadata } from "../tools/utils";
import { ChromaRecord } from "../tools/chroma-tool";

// Internal type that includes distance for merging
type ChromaRecordWithDistance = ChromaRecord & { distance: number };

export class ChromaDBBackend implements SearchBackend {
  readonly name = "chromadb";
  private orgCtxLayerApiUrl: string;

  constructor(
    private collection: Collection,
    private client?: ChromaClient
  ) {
    // Fetch org-ctx-layer API URL from environment
    // Fallback chain: ORG_CTX_LAYER_API_URL -> SEARCH_API_URL -> default
    this.orgCtxLayerApiUrl =
      process.env.ORG_CTX_LAYER_API_URL ||
      process.env.SEARCH_API_URL ||
      "http://localhost:3059";
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const start = Date.now();

    // Resolve source/group to collection names
    const collectionNames = await this.resolveToCollections(params.source);

    // Determine how many results to query from each collection
    // Over-query strategy: query 2x from each collection to ensure quality
    const nResultsPerCollection = (params.nResults || 5) * 2;

    // Query all collections in parallel
    const queryPromises = collectionNames.map((name) =>
      this.queryCollection(
        name,
        params.query,
        nResultsPerCollection,
        params.where
      )
    );

    // Wait for all queries (fail if any fails - Blocker 6 decision)
    let collectionResults: { records: ChromaRecordWithDistance[]; latency: string }[];
    try {
      collectionResults = await Promise.all(queryPromises);
    } catch (error) {
      // If any collection fails, fail entire query
      throw new AgentError(
        `Multi-collection query failed: ${
          error instanceof Error ? error.message : String(error)
        }\n` + `Collections: ${collectionNames.join(", ")}`
      );
    }

    // Merge and rank results
    const mergedResult = this.mergeResults(
      collectionResults,
      params.nResults || 5
    );

    const end = Date.now();

    return {
      records: mergedResult.records,
      latency: `${(end - start).toFixed(2)} ms (total)`,
    };
  }

  async listSources(): Promise<SourceListItem[]> {
    try {
      // Fetch from org-ctx-layer API (same source as group resolution)
      return await this.fetchSourcesList();
    } catch (error) {
      throw new AgentError(
        `Failed to list sources: ${error instanceof Error ? error.message : String(error)}\n` +
          `Ensure ORG_CTX_LAYER_API_URL is configured and org-ctx-layer API is running.`
      );
    }
  }

  async healthCheck(): Promise<void> {
    // Check 1: ChromaDB connection
    if (!this.client) {
      throw new AgentError(
        "ChromaDB client not available. Cannot perform health check."
      );
    }

    try {
      await this.client.heartbeat();
    } catch (error) {
      throw new AgentError(
        `ChromaDB health check failed: ${error instanceof Error ? error.message : String(error)}\n` +
          `Ensure ChromaDB is running at ${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT}`
      );
    }

    // Check 2: Group metadata API (required for multi-source queries)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.orgCtxLayerApiUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      throw new AgentError(
        `org-ctx-layer API health check failed: ${error instanceof Error ? error.message : String(error)}\n` +
          `API URL: ${this.orgCtxLayerApiUrl}\n` +
          `Ensure ORG_CTX_LAYER_API_URL is configured correctly and org-ctx-layer is running.\n` +
          `Multi-source queries require API access for group metadata.`
      );
    }
  }

  /**
   * Query a single ChromaDB collection
   */
  private async queryCollection(
    collectionName: string,
    query: string,
    nResults: number,
    where?: Record<string, any>
  ): Promise<{ records: ChromaRecordWithDistance[]; latency: string }> {
    const start = Date.now();

    if (!this.client) {
      throw new AgentError(
        "ChromaDB client not available. Cannot query multiple collections."
      );
    }

    try {
      // Get collection by name
      const collection = await this.client.getCollection({
        name: collectionName,
        embeddingFunction: new OpenAIEmbeddingFunction({
          modelName: "text-embedding-3-large",
        }),
      });

      // Query collection
      const results = await collection.query<RecordMetadata>({
        queryTexts: [query],
        where: where || { query: { $ne: true } },
        nResults: nResults,
      });

      const end = Date.now();

      // Process results and include distance for merging
      const records: ChromaRecordWithDistance[] = results.rows()[0].map((record, idx) => ({
        id: record.id,
        sourceDocUid: record.metadata?.source_doc_uid as string | undefined,
        source: record.metadata?.source as string | undefined,
        path: record.metadata?.path as string | undefined,
        document: record.document || "Corrupted",
        distance: record.distance || 0,
      }));

      return {
        records,
        latency: `${(end - start).toFixed(2)} ms`,
      };
    } catch (error) {
      // Enhance error message based on error type
      if (
        error instanceof Error &&
        error.message.includes("does not exist")
      ) {
        throw new AgentError(
          `Collection "${collectionName}" does not exist in ChromaDB.\n` +
            `Ensure org-ctx-layer has indexed this source.\n` +
            `Available collections: Run "ctx-agent --list-sources"`
        );
      }

      throw new AgentError(
        `Failed to query collection "${collectionName}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Merge and rank results from multiple collections
   * Assumes all collections use same embedding model (text-embedding-3-large)
   */
  private mergeResults(
    collectionResults: { records: ChromaRecordWithDistance[]; latency: string }[],
    nResults: number
  ): { records: ChromaRecord[]; latency: string } {
    // Flatten all records
    const allRecords = collectionResults.flatMap((r) => r.records);

    // Sort by distance (ascending = more relevant)
    allRecords.sort((a, b) => a.distance - b.distance);

    // Take top N results and strip distance
    const topRecords: ChromaRecord[] = allRecords.slice(0, nResults).map(({ distance, ...record }) => record);

    // Calculate total latency (max of all queries since parallel)
    const maxLatency = Math.max(
      ...collectionResults.map((r) => parseFloat(r.latency))
    );

    return {
      records: topRecords,
      latency: `${maxLatency.toFixed(2)} ms`,
    };
  }

  /**
   * Fetch available sources and groups from org-ctx-layer API
   */
  private async fetchSourcesList(): Promise<SourceListItem[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(
        `${this.orgCtxLayerApiUrl}/api/sources-list`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`
        );
      }

      return (await response.json()) as SourceListItem[];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AgentError(
          `Timeout fetching sources list from ${this.orgCtxLayerApiUrl}`
        );
      }
      throw new AgentError(
        `Failed to fetch sources list: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Resolve source or group name to array of collection names
   * @param source - Source name, group name, or undefined for default
   * @returns Array of ChromaDB collection names to query
   */
  private async resolveToCollections(source?: string): Promise<string[]> {
    // If no source specified, use current collection
    if (!source) {
      return [this.collection.name];
    }

    // Fetch available sources and groups from API
    const sourcesList = await this.fetchSourcesList();

    // Find the source/group by name
    const item = sourcesList.find((s) => s.name === source);

    if (!item) {
      throw new AgentError(
        `Source or group "${source}" not found.\n\n` +
          `Available sources and groups:\n` +
          `  ${sourcesList.map((s) => s.name).join(", ")}\n\n` +
          `Run "ctx-agent --list-sources" for details.`
      );
    }

    // If it's a group, resolve to member sources
    if (item.type === "group") {
      if (!item.sources || item.sources.length === 0) {
        throw new AgentError(
          `Group "${source}" is empty (no member sources).\n` +
            `This may indicate a configuration issue in org-ctx-layer.`
        );
      }

      // Use source name as collection name (Blocker 3 decision)
      return item.sources;
    }

    // Individual source: use source name as collection name
    return [item.name];
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
