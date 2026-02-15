import { SearchBackend } from "../backends/search-backend";
import { SemanticSearchTool } from "./semantic-search";

export function searchToolsFactory(backend: SearchBackend) {
  return [
    new SemanticSearchTool(backend),
    // Lexical and Hybrid search removed (no sparse embeddings)
  ];
}

// Export only what we use
export * from "./semantic-search";
export * from "./chroma-tool";
export * from "./utils";
