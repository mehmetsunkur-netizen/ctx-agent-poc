import { LLMServiceConfig, RunConfig } from "@isara-ctx/agent-framework";
import { Collection } from "chromadb";
import { CTXAgentStatusHandler } from "./status-handler";

// Removed: Query interface (no query retrieval)
// Removed: QueryRecordMetadata type

export interface CTXAgentConfig {
  llmConfig: LLMServiceConfig;
  collection: Collection;
  statusHandler?: CTXAgentStatusHandler;
}

export interface CTXAgentRunConfig extends Omit<
  RunConfig,
  "maxPlanSize" | "maxStepIterations"
> {
  query: string;  // Direct query string (not queryId)
  maxPlanSize?: number;
  maxStepIterations?: number;
}
