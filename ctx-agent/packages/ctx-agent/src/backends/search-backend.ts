import { ChromaRecord } from "../tools/chroma-tool";

export interface SearchParams {
  query: string;
  nResults?: number;
  where?: Record<string, any>;
}

export interface SearchResult {
  records: ChromaRecord[];
  latency: string;
}

export interface SearchBackend {
  search(params: SearchParams): Promise<SearchResult>;
  healthCheck(): Promise<void>;
  readonly name: string;
}
