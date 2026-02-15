import { SearchBackend } from "./search-backend";
import { ChromaDBBackend } from "./chromadb-backend";
import { HttpSearchBackend } from "./http-backend";
import { loadSearchBackendConfig } from "./config";
import { getContextEngineCollection } from "../chroma";

export async function createSearchBackend(): Promise<SearchBackend> {
  const config = loadSearchBackendConfig();

  let backend: SearchBackend;

  if (config.type === "chroma") {
    console.log(`[SearchBackend] Connecting to ChromaDB at ${config.chromaHost}:${config.chromaPort}`);
    const result = await getContextEngineCollection();
    backend = new ChromaDBBackend(result.collection, result.client);
  } else {
    console.log(`[SearchBackend] Connecting to HTTP API at ${config.apiUrl}`);
    backend = new HttpSearchBackend(config.apiUrl!, config.timeout);
  }

  // Health check (fail fast)
  await backend.healthCheck();
  console.log(`[SearchBackend] Health check passed for ${backend.name} backend`);

  return backend;
}
