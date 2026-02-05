import { Collection } from "chromadb";
import { SemanticSearchTool } from "./semantic-search";

export function searchToolsFactory(collection: Collection) {
  return [
    new SemanticSearchTool(collection),
    // Lexical and Hybrid search removed (no sparse embeddings)
  ];
}

// Export only what we use
export * from "./semantic-search";
export * from "./chroma-tool";
export * from "./utils";
