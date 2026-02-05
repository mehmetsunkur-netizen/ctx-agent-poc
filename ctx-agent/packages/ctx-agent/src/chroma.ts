import { ChromaClient } from "chromadb";
import { AgentError } from "@isara-ctx/agent-framework";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

const CONTEXT_ENGINE_COLLECTION_NAME = "context_engine";

export async function getContextEngineCollection() {
  const host = process.env.CHROMA_HOST || "localhost";
  const port = process.env.CHROMA_PORT || "8000";
  const path = `http://${host}:${port}`;

  const client = new ChromaClient({ path });

  // Health check
  try {
    await client.heartbeat();
  } catch (error) {
    throw new AgentError(
      `Cannot connect to ChromaDB at ${path}.\n` +
      `Ensure ChromaDB is running:\n` +
      `  docker run -p 8000:8000 chromadb/chroma\n` +
      `Or check CHROMA_HOST and CHROMA_PORT environment variables.`,
      error
    );
  }

  // Initialize embedding function
  // Use the same model that was used during indexing
  const embeddingFunction = new OpenAIEmbeddingFunction({
    modelName: "text-embedding-3-large",
  });

  // Get collection
  let collection;
  try {
    collection = await client.getCollection({
      name: CONTEXT_ENGINE_COLLECTION_NAME,
      embeddingFunction: embeddingFunction,
    });
  } catch (error) {
    // List available collections for helpful error
    const collections = await client.listCollections();
    const collectionNames = collections.map(c => c.name).join(", ");

    throw new AgentError(
      `Collection "${CONTEXT_ENGINE_COLLECTION_NAME}" not found.\n` +
      `Available collections: ${collectionNames || "none"}\n` +
      `Create the collection first or check the collection name.`,
      error
    );
  }

  return collection;
}
