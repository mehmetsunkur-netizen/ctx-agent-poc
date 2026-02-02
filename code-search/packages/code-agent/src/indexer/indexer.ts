import { Collection, ChromaClient } from "chromadb";
import { CommitDetails, Diffs, Repository } from "../repository";
import { Chunker } from "../chunker";
import { encoding_for_model, Tiktoken } from "tiktoken";
import path from "path";
import fs from "fs";
import ignore from "ignore";
import { AgentError } from "@isara-ctx/agent-framework";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { Chunk } from "../chunker/types";

export class Indexer {
  private static MAX_TOKEN = 8192;
  private static BATCH_SIZE = 300;

  private chromaClient: ChromaClient;
  private mainCollectionName: string;
  private dirtyCollectionName: string;
  private embeddingFunction: OpenAIEmbeddingFunction;
  private chunker: Chunker;
  repository: Repository;

  constructor({
    chromaClient,
    repository,
  }: {
    chromaClient: ChromaClient;
    repository: Repository;
  }) {
    this.chromaClient = chromaClient;
    this.repository = repository;

    // Collection names
    const repoName = path.basename(repository.path);
    this.mainCollectionName = `repo-${this.sanitizeRepoName(repoName)}`;
    this.dirtyCollectionName = `${this.mainCollectionName}-dirty`;

    // Initialize chunker
    const encoder: Tiktoken = encoding_for_model("text-embedding-3-large");
    this.chunker = new Chunker({
      rootPath: this.repository.path,
      encoder,
      maxTokens: Indexer.MAX_TOKEN,
    });

    // Initialize embedding function
    this.embeddingFunction = new OpenAIEmbeddingFunction({
      modelName: "text-embedding-3-large",
    });
  }

  private sanitizeRepoName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  static async create({
    repository,
  }: {
    repository: Repository;
  }): Promise<Indexer> {
    // Initialize ChromaClient for local connection
    const chromaClient = new ChromaClient({
      path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || '8000'}`
    });

    // Test connection
    try {
      await chromaClient.heartbeat();
    } catch (error) {
      throw new AgentError(
        `Cannot connect to ChromaDB at http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || '8000'}\n` +
        'Is ChromaDB running? Check: docker ps',
        error
      );
    }

    return new Indexer({ chromaClient, repository });
  }

  private static async addBatch(chunks: Chunk[], collection: Collection) {
    const batch = chunks.slice(0, Indexer.BATCH_SIZE);

    try {
      await collection.add({
        ids: batch.map((chunk) => chunk.id),
        documents: batch.map((chunk) => chunk.document),
        metadatas: batch.map((chunk) => {
          const { id, document, symbol, ...metadata } = chunk;
          // Only include symbol if it's defined (Chroma doesn't accept null/undefined)
          return symbol ? { ...metadata, symbol } : metadata;
        }),
      });
    } catch (error) {
      throw new AgentError(
        `Failed to add batch to collection ${collection.name}`,
        error,
      );
    }

    return chunks.slice(Indexer.BATCH_SIZE);
  }

  async run(): Promise<Collection> {
    const head = await this.repository.headCommit();

    // Get or create main collection
    const mainCollection = await this.getOrCreateMainCollection();

    // Get last indexed commit from metadata
    const metadata = await mainCollection.metadata;
    const lastIndexedCommit = metadata?.lastIndexedCommit as string | undefined;

    if (!lastIndexedCommit) {
      // First time - full index
      console.log('Indexing repository for first time...');
      await this.indexFullRepository(mainCollection, head);
      console.log(`✓ Indexed repository (commit: ${head.id.slice(0, 8)})`);
    } else if (head.id !== lastIndexedCommit) {
      // Incremental update
      console.log('Updating index...');
      const diffs = await this.repository.commitDiffs(lastIndexedCommit, head.id);
      await this.updateIncremental(mainCollection, diffs, head.id);
      console.log(`✓ Updated index (${diffs.modified.length + diffs.added.length + diffs.deleted.length} files changed)`);
    } else {
      console.log('Index up to date');
    }

    // Handle uncommitted changes
    const dirtyCollection = await this.handleDirtyCollection(head.id);

    // Return dirty if exists, otherwise main
    return dirtyCollection || mainCollection;
  }

  private async getOrCreateMainCollection(): Promise<Collection> {
    try {
      return await this.chromaClient.getCollection({
        name: this.mainCollectionName,
        embeddingFunction: this.embeddingFunction
      });
    } catch {
      // Doesn't exist - create it
      return await this.chromaClient.createCollection({
        name: this.mainCollectionName,
        embeddingFunction: this.embeddingFunction,
        metadata: {
          repositoryPath: this.repository.path,
          repositoryName: path.basename(this.repository.path)
        }
      });
    }
  }

  private async indexFullRepository(collection: Collection, commit: CommitDetails): Promise<void> {
    const ig = ignore();
    const gitignore = path.join(this.repository.path, ".gitignore");
    if (fs.existsSync(gitignore)) {
      const content = await fs.promises.readFile(gitignore, "utf8");
      ig.add(content);
      ig.add(".git");
    }

    let chunks: Chunk[] = [];

    const walkRepo = async (dir: string) => {
      const entries = await fs.promises
        .readdir(dir, { withFileTypes: true })
        .catch(() => []);
      for (const entry of entries) {
        const absolutePath = path.join(dir, entry.name);
        const relativePath = path.relative(this.repository.path, absolutePath);

        if (ig.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkRepo(absolutePath);
        } else if (entry.isFile()) {
          const fileChunks = await this.chunker.chunkFile(relativePath);
          chunks.push(...fileChunks);
          if (chunks.length > Indexer.BATCH_SIZE) {
            chunks = await Indexer.addBatch(chunks, collection);
          }
        }
      }
    };

    await walkRepo(this.repository.path);
    while (chunks.length > 0) {
      chunks = await Indexer.addBatch(chunks, collection);
    }

    // Update metadata with indexed commit info
    await collection.modify({
      metadata: {
        lastIndexedCommit: commit.id,
        lastIndexedAt: new Date().toISOString(),
        repositoryPath: this.repository.path,
        repositoryName: path.basename(this.repository.path)
      }
    });
  }

  private async updateIncremental(
    collection: Collection,
    diffs: Diffs,
    newCommitId: string
  ): Promise<void> {
    // Step 1: Delete old chunks for modified/deleted files
    const filesToDelete = [...diffs.modified, ...diffs.deleted];
    if (filesToDelete.length > 0) {
      await collection.delete({
        where: {
          filePath: { $in: filesToDelete }
        }
      });
    }

    // Step 2: Add new chunks for added/modified files
    const filesToAdd = [...diffs.added, ...diffs.modified];
    if (filesToAdd.length > 0) {
      let chunks: Chunk[] = [];
      for (const filePath of filesToAdd) {
        const fileChunks = await this.chunker.chunkFile(filePath);
        chunks.push(...fileChunks);
        if (chunks.length > Indexer.BATCH_SIZE) {
          chunks = await Indexer.addBatch(chunks, collection);
        }
      }

      while (chunks.length > 0) {
        chunks = await Indexer.addBatch(chunks, collection);
      }
    }

    // Step 3: Update metadata
    await collection.modify({
      metadata: {
        lastIndexedCommit: newCommitId,
        lastIndexedAt: new Date().toISOString()
      }
    });
  }

  private async handleDirtyCollection(baseCommitId: string): Promise<Collection | null> {
    const workingTreeDiffs = await this.repository.workingTreeDiffs(baseCommitId);

    if (workingTreeDiffs.clean) {
      // No uncommitted changes - delete dirty collection if exists
      try {
        await this.chromaClient.deleteCollection({
          name: this.dirtyCollectionName
        });
      } catch {
        // Doesn't exist, that's fine
      }
      return null;
    }

    console.log('Uncommitted changes detected, updating dirty collection...');

    // Has uncommitted changes - get or create dirty collection
    let dirtyCollection: Collection;
    try {
      dirtyCollection = await this.chromaClient.getCollection({
        name: this.dirtyCollectionName,
        embeddingFunction: this.embeddingFunction
      });
    } catch {
      // Create new dirty collection as copy of main
      dirtyCollection = await this.chromaClient.createCollection({
        name: this.dirtyCollectionName,
        embeddingFunction: this.embeddingFunction,
        metadata: {
          baseCommit: baseCommitId,
          createdAt: new Date().toISOString()
        }
      });

      // Copy all data from main collection
      const mainCollection = await this.getOrCreateMainCollection();
      const allData = await mainCollection.get();
      if (allData.ids.length > 0) {
        // Filter out null values from documents and metadatas
        const documents = (allData.documents || []).filter((d): d is string => d !== null);
        const metadatas = (allData.metadatas || []).filter((m): m is Record<string, any> => m !== null);

        await dirtyCollection.add({
          ids: allData.ids,
          documents,
          metadatas
        });
      }
    }

    // Update with uncommitted changes
    await this.updateIncremental(dirtyCollection, workingTreeDiffs, 'dirty');

    console.log(`✓ Updated dirty collection (${workingTreeDiffs.modified.length + workingTreeDiffs.added.length} files)`);

    return dirtyCollection;
  }
}
