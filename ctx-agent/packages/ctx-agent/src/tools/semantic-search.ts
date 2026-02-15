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

  constructor(backend: SearchBackend) {
    super({
      id: "semantic_search",
      name: "Semantic Search",
      description:
        "Dense-vector semantic search. Use this when you want to find documents that are **conceptually related** to a natural-language question or idea",
      parametersSchema: parametersSchema,
    });
    this.backend = backend;
  }

  public async execute(
    parameters: z.infer<typeof parametersSchema>,
  ): Promise<ChromaToolResult> {
    return this.backend.search({
      query: parameters.query,
      nResults: 5,
      where: { query: { $ne: true } },
    });
  }
}
