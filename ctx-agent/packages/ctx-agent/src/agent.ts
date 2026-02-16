import {
  BaseAgent,
  BaseAgentServices,
} from "@isara-ctx/agent-framework";
import {
  answerSchema,
  CTXAgentTypes,
  outcomeSchema,
  stepSchema,
} from "./schemas";
import { SearchBackend } from "./backends/search-backend";
import {
  CTXAgentConsoleStatusHandler,
  CTXAgentStatusHandler,
} from "./status-handler";
import { ctxAgentPrompts } from "./prompts";
import { searchToolsFactory } from "./tools";
import { createSearchBackend } from "./backends/factory";
import { CTXAgentConfig, CTXAgentRunConfig } from "./types";

export class ContextEngineAgent {
  private static MAX_PLAN_SIZE = 10;
  private static MAX_STEP_ITERATIONS = 5;

  private readonly searchBackend: SearchBackend;
  private readonly llmConfig;
  private readonly statusHandler: CTXAgentStatusHandler | undefined;

  protected constructor({
    llmConfig,
    backend,
    statusHandler,
  }: CTXAgentConfig) {
    this.searchBackend = backend;
    this.llmConfig = llmConfig;
    this.statusHandler = statusHandler;
  }

  static async create(config: Omit<CTXAgentConfig, "backend">) {
    const backend = await createSearchBackend();
    return new ContextEngineAgent({
      backend,
      ...config,
    });
  }

  async answer({
    query,
    source,
    maxPlanSize = ContextEngineAgent.MAX_PLAN_SIZE,
    maxStepIterations = ContextEngineAgent.MAX_STEP_ITERATIONS,
    signal,
  }: CTXAgentRunConfig) {
    // Create agent with source-specific tools
    const agent = BaseAgent.create({
      llmConfig: this.llmConfig,
      schemas: {
        step: stepSchema,
        outcome: outcomeSchema,
        answer: answerSchema,
      },
      services: {
        statusHandler: this.statusHandler ?? new CTXAgentConsoleStatusHandler(),
        prompts: ctxAgentPrompts,
      },
      tools: searchToolsFactory(this.searchBackend, source),
    });

    return agent.run({
      query,
      maxPlanSize,
      maxStepIterations,
      signal,
    });
  }
}
