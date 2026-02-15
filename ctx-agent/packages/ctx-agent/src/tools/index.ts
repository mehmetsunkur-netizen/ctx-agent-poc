import { SearchBackend } from "../backends/search-backend";
import { SemanticSearchTool } from "./semantic-search";

export function searchToolsFactory(backend: SearchBackend, source?: string) {
  return [
    new SemanticSearchTool(backend, source),
    // Lexical and Hybrid search removed (no sparse embeddings)
  ];
}

// Export only what we use
export * from "./semantic-search";
export * from "./chroma-tool";
export * from "./utils";
