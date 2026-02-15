import { ChromaRecord } from "../tools/chroma-tool";

export interface SearchParams {
  query: string;
  nResults?: number;
  where?: Record<string, any>;
  /**
   * Data source or group to query
   * - If undefined: query default source(s)
   * - If source name: query that source
   * - If group name: query all sources in group
   */
  source?: string;
}

export interface SearchResult {
  records: ChromaRecord[];
  latency: string;
}

export interface SourceListItem {
  /** Type: individual source or group */
  type: "source" | "group";
  /** Unique identifier */
  id: string;
  /** Machine-readable name (e.g., "slack") */
  name: string;
  /** Human-readable display name (e.g., "Slack Messages") */
  displayName: string;
  /** Description of the source */
  description?: string;
  /** Array of member sources (groups only) */
  sources?: string[];
  /** ChromaDB collection name (sources only) */
  collection?: string;
}

export interface SearchBackend {
  /**
   * Execute semantic search
   */
  search(params: SearchParams): Promise<SearchResult>;

  /**
   * List available data sources and groups
   */
  listSources(): Promise<SourceListItem[]>;

  /**
   * Verify backend is healthy
   */
  healthCheck(): Promise<void>;

  readonly name: string;
}
