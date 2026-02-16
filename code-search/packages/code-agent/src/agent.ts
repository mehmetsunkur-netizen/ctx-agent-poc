import { Collection } from "chromadb";
import { getCollection } from "./chroma-client";
import {
  CodeSearchAgentConfig,
  CodeSearchAgentCreateConfig,
  CodeSearchAgentRunConfig,
  CodeSearchAgentStatusHandler,
  CodeSearchAgentTypes,
} from "./types";
import { AgentError, BaseAgent } from "@isara-ctx/agent-framework";
import { answerSchema, outcomeSchema, stepSchema } from "./schemas";
import { codeSearchAgentPrompts } from "./prompts";
import {
  GetFileTool,
  ListFilesTool,
  RegexSearchTool,
  SemanticSearchTool,
  SymbolSearchTool,
} from "./tools";

export class CodeSearchAgent {
  private static MAX_PLAN_SIZE = 10;
  private static MAX_STEP_ITERATIONS = 5;

  private collection: Collection;
  private repositoryPath: string | undefined;
  private agent: BaseAgent<CodeSearchAgentTypes>;
  private statusHandler: CodeSearchAgentStatusHandler | undefined;

  private constructor({
    collection,
    repositoryPath,
    llmConfig,
    statusHandler,
  }: CodeSearchAgentConfig) {
    this.collection = collection;
    this.repositoryPath = repositoryPath;
    this.statusHandler = statusHandler;
    this.agent = BaseAgent.create({
      llmConfig,
      schemas: {
        step: stepSchema,
        outcome: outcomeSchema,
        answer: answerSchema,
      },
      services: { statusHandler, prompts: codeSearchAgentPrompts },
      tools: repositoryPath ? [new ListFilesTool(repositoryPath)] : [],
    });
  }

  static async create({
    collection,
    collectionName,
    repositoryPath,
    ...config
  }: CodeSearchAgentCreateConfig) {
    // Accept either collection object or collection name
    let coll: Collection;

    if (collection) {
      coll = collection;
    } else if (collectionName) {
      coll = await getCollection(collectionName);
    } else {
      throw new AgentError("Must provide collection or collectionName");
    }

    return new CodeSearchAgent({
      collection: coll,
      repositoryPath,
      ...config,
    });
  }

  async run({
    query,
    maxPlanSize = CodeSearchAgent.MAX_PLAN_SIZE,
    maxStepIterations = CodeSearchAgent.MAX_STEP_ITERATIONS,
    signal,
  }: CodeSearchAgentRunConfig) {
    // No indexing! Use pre-existing collection
    return await this.agent.run({
      query,
      maxPlanSize,
      maxStepIterations,
      signal,
      runtimeTools: [
        new SymbolSearchTool(this.collection),
        new RegexSearchTool(this.collection),
        new SemanticSearchTool(this.collection),
        new GetFileTool(this.collection),
      ],
    });
  }

  /**
   * Get collection metadata and info
   */
  async getCollectionInfo() {
    return {
      name: this.collection.name,
      metadata: await this.collection.metadata,
      count: await this.collection.count(),
    };
  }

  /**
   * Check collection health
   */
  async healthCheck() {
    try {
      const count = await this.collection.count();
      return { healthy: true, documentCount: count };
    } catch (error) {
      return { healthy: false, error: String(error) };
    }
  }
}
