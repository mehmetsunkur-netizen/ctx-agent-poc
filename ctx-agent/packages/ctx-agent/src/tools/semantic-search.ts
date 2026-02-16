import { z } from "zod";
import { ChromaTool, ChromaToolResult } from "./chroma-tool";
import { SearchBackend } from "../backends/search-backend";

const parametersSchema = z.object({
  query: z
    .string()
    .describe(
      "A short natural-language phrase or sentence describing the meaning of what to search for",
    ),
});

export class SemanticSearchTool extends ChromaTool {
  private backend: SearchBackend;
  private source?: string;

  constructor(backend: SearchBackend, source?: string) {
    super({
      id: "semantic_search",
      name: "Semantic Search",
      description:
        `Search the organizational knowledge base using semantic similarity (dense-vector search).

This tool searches across multiple source types that may include conversational data, documentation, and files. Use this when you want to find content that is **conceptually related** to a natural-language question or idea.

Results may include metadata such as:
- Source type (conversations, documents, files, etc.)
- Timestamp (when the content was created/modified)
- Author/creator information
- Location (channel, folder, path, etc.)

Best for:
- Broad exploratory searches
- Finding conceptually similar information
- Discovering related discussions or documents
- When you don't know exact keywords

Note: This tool searches based on meaning, not exact text matching. Results are semantically relevant even if they don't contain your exact query terms.`,
      parametersSchema: parametersSchema,
    });
    this.backend = backend;
    this.source = source;
  }

  public async execute(
    parameters: z.infer<typeof parametersSchema>,
  ): Promise<ChromaToolResult> {
    return this.backend.search({
      query: parameters.query,
      nResults: 5,
      where: { query: { $ne: true } },
      source: this.source,
    });
  }
}
