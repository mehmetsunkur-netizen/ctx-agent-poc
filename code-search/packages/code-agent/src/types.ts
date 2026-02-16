import { Collection } from "chromadb";
import {
  AgentStatusHandler,
  baseEvaluationSchema,
  LLMServiceConfig,
  RunConfig,
} from "@isara-ctx/agent-framework";
import { answerSchema, outcomeSchema, stepSchema } from "./schemas";

export interface CodeSearchAgentConfig {
  collection: Collection;
  repositoryPath?: string;
  llmConfig: LLMServiceConfig;
  statusHandler?: CodeSearchAgentStatusHandler;
}

export interface CodeSearchAgentStatusHandler extends AgentStatusHandler<CodeSearchAgentTypes> {
  /**
   * @deprecated No longer used (indexing removed from agent)
   */
  onIndex?(): void;
}

export interface CodeSearchAgentCreateConfig {
  /**
   * ChromaDB collection to query
   * Provide either this OR collectionName
   */
  collection?: Collection;

  /**
   * Name of ChromaDB collection to query
   * Collection must already exist (be indexed)
   */
  collectionName?: string;

  /**
   * Optional repository path for context
   * Not used for indexing, only for metadata/tools
   */
  repositoryPath?: string;

  llmConfig: LLMServiceConfig;
  statusHandler?: CodeSearchAgentStatusHandler;
}

export interface CodeSearchAgentTypes {
  step: typeof stepSchema;
  outcome: typeof outcomeSchema;
  evaluation: typeof baseEvaluationSchema;
  answer: typeof answerSchema;
}

export interface CodeSearchAgentRunConfig extends Omit<
  RunConfig,
  "maxPlanSize" | "maxStepIterations"
> {
  maxPlanSize?: number;
  maxStepIterations?: number;
}
