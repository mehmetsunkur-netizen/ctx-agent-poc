import { LLMServiceConfig, RunConfig } from "@isara-ctx/agent-framework";
import { SearchBackend } from "./backends/search-backend";
import { CTXAgentStatusHandler } from "./status-handler";

// Removed: Query interface (no query retrieval)
// Removed: QueryRecordMetadata type

export interface CTXAgentConfig {
  llmConfig: LLMServiceConfig;
  backend: SearchBackend;
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
