import { ChromaClient, Collection } from "chromadb";
import { createEmbeddingFunction } from "./embedding";

/**
 * Cached ChromaDB client instance
 */
let cachedClient: ChromaClient | null = null;

/**
 * ChromaDB configuration
 */
export interface ChromaConfig {
  host?: string;
  port?: number;
  auth?: {
    provider: string;
    credentials?: string;
    token?: string;
  };
}

/**
 * Get or create ChromaDB client
 * Caches client for reuse across calls
 */
export async function getChromaClient(config?: ChromaConfig): Promise<ChromaClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const host = config?.host || process.env.CHROMA_HOST || "localhost";
  const port = config?.port || parseInt(process.env.CHROMA_PORT || "8000");

  cachedClient = new ChromaClient({
    path: `http://${host}:${port}`,
    auth: config?.auth,
  });

  // Test connection
  try {
    await cachedClient.heartbeat();
  } catch (error) {
    cachedClient = null;
    throw new Error(`Failed to connect to ChromaDB at ${host}:${port}: ${error}`);
  }

  return cachedClient;
}

/**
 * Get an existing collection by name
 * Throws if collection doesn't exist
 *
 * IMPORTANT: Retrieves collection WITH embedding function to ensure
 * semantic search and query vectorization work correctly
 */
export async function getCollection(
  collectionName: string,
  config?: ChromaConfig
): Promise<Collection> {
  const client = await getChromaClient(config);
  const embeddingFunction = createEmbeddingFunction();

  try {
    return await client.getCollection({
      name: collectionName,
      embeddingFunction,
    });
  } catch (error) {
    throw new Error(
      `Collection not found: ${collectionName}. Has it been indexed? Use: pnpm index <path> --collection ${collectionName}`
    );
  }
}

/**
 * Check if a collection exists
 */
export async function collectionExists(
  collectionName: string,
  config?: ChromaConfig
): Promise<boolean> {
  const client = await getChromaClient(config);

  try {
    await client.getCollection({ name: collectionName });
    return true;
  } catch {
    return false;
  }
}

/**
 * List all available collections
 */
export async function listCollections(config?: ChromaConfig): Promise<string[]> {
  const client = await getChromaClient(config);
  const collections = await client.listCollections();
  return collections.map((c) => c.name);
}

/**
 * Clear cached client (useful for testing)
 */
export function clearClientCache(): void {
  cachedClient = null;
}
