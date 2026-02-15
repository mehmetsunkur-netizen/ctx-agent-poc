import { Collection } from "chromadb";
import { SearchBackend, SearchParams, SearchResult } from "./search-backend";
import { processSearchResults, RecordMetadata } from "../tools/utils";

export class ChromaDBBackend implements SearchBackend {
  readonly name = "chromadb";

  constructor(private collection: Collection) {}

  async search(params: SearchParams): Promise<SearchResult> {
    const start = Date.now();

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

  async healthCheck(): Promise<void> {
    // No-op: health check already done in getContextEngineCollection()
  }
}
