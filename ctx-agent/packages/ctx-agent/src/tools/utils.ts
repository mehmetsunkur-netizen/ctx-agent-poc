import { QueryResult, SearchResult } from "chromadb";
import { ChromaRecord } from "./chroma-tool";

export type RecordMetadata = {
  source_doc_uid?: string;
  source?: string;
  path?: string;
};

export function processSearchResults(
  records: QueryResult<RecordMetadata> | SearchResult,
): ChromaRecord[] {
  return records.rows()[0].map((record) => ({
    id: record.id,
    sourceDocUid: record.metadata?.source_doc_uid as string | undefined,
    source: record.metadata?.source as string | undefined,
    path: record.metadata?.path as string | undefined,
    document: record.document || "Corrupted",
  }));
}
