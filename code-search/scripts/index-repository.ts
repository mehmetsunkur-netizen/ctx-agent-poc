#!/usr/bin/env tsx
import { Indexer } from "../packages/code-agent/src/indexer";
import { GitRepository } from "../packages/code-agent/src/repository";
import { program } from "commander";
import chalk from "chalk";

interface IndexOptions {
  collection?: string;
  force?: boolean;
}

program
  .name("index-repository")
  .description("Index a Git repository into ChromaDB for code-search")
  .argument("<repo-path>", "Path to the Git repository")
  .option("-c, --collection <name>", "Collection name (default: auto-generated from repo name)")
  .option("-f, --force", "Force full re-index (ignore incremental updates)", false)
  .action(async (repoPath: string, options: IndexOptions) => {
    try {
      console.log(chalk.blue("🔍 Code-Search Indexer\n"));
      console.log(chalk.gray(`Repository: ${repoPath}`));

      // Create repository
      const repository = new GitRepository(repoPath);

      // Create indexer
      const indexer = await Indexer.create({ repository });

      // Override collection name if provided
      if (options.collection) {
        console.log(chalk.gray(`Collection: ${options.collection}`));
        indexer.mainCollectionName = options.collection;
      } else {
        console.log(chalk.gray(`Collection: ${indexer.mainCollectionName}`));
      }

      // Start indexing
      console.log(chalk.blue("\n⏳ Indexing..."));
      const startTime = Date.now();

      const collection = await indexer.run();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const count = await collection.count();

      // Success
      console.log(chalk.green("\n✅ Indexing complete!"));
      console.log(chalk.gray(`\nCollection: ${collection.name}`));
      console.log(chalk.gray(`Documents: ${count}`));
      console.log(chalk.gray(`Duration: ${duration}s`));

      console.log(chalk.blue("\n💡 Query your code:"));
      console.log(chalk.white(`  pnpm cli:dev "your question" --collection ${collection.name}`));
      console.log(chalk.white(`  # or set environment variable:`));
      console.log(chalk.white(`  export CHROMA_COLLECTION=${collection.name}`));
    } catch (error) {
      console.error(chalk.red("\n❌ Indexing failed:"));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.stack) {
        console.error(chalk.gray("\nStack trace:"));
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();
