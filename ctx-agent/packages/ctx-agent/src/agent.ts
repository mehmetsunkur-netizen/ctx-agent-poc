import {
  BaseAgent,
  BaseAgentServices,
} from "@isara-ctx/agent-framework";
import {
  answerSchema,
  BCPAgentTypes,
  outcomeSchema,
  stepSchema,
} from "./schemas";
import { SearchBackend } from "./backends/search-backend";
import {
  CTXAgentConsoleStatusHandler,
  CTXAgentStatusHandler,
} from "./status-handler";
import { bcpAgentPrompts } from "./prompts";
import { searchToolsFactory } from "./tools";
import { createSearchBackend } from "./backends/factory";
import { CTXAgentConfig, CTXAgentRunConfig } from "./types";

export class ContextEngineAgent {
  private static MAX_PLAN_SIZE = 10;
  private static MAX_STEP_ITERATIONS = 5;

  private readonly searchBackend: SearchBackend;
  private agent: BaseAgent<BCPAgentTypes, BaseAgentServices<BCPAgentTypes>>;
  private statusHandler: CTXAgentStatusHandler | undefined;

  protected constructor({
    llmConfig,
    backend,
    statusHandler,
  }: CTXAgentConfig) {
    this.searchBackend = backend;
    this.statusHandler = statusHandler;

    this.agent = BaseAgent.create({
      llmConfig,
      schemas: {
        step: stepSchema,
        outcome: outcomeSchema,
        answer: answerSchema,
      },
      services: {
        statusHandler: statusHandler ?? new CTXAgentConsoleStatusHandler(),
        prompts: bcpAgentPrompts,
      },
      tools: searchToolsFactory(this.searchBackend),
    });
  }

  static async create(config: Omit<CTXAgentConfig, "backend">) {
    const backend = await createSearchBackend();
    return new ContextEngineAgent({
      backend,
      ...config,
    });
  }

  async answer({
    query,  // Now accepts query string directly!
    maxPlanSize = ContextEngineAgent.MAX_PLAN_SIZE,
    maxStepIterations = ContextEngineAgent.MAX_STEP_ITERATIONS,
    signal,
  }: CTXAgentRunConfig) {
    // No getQuery() call - use query directly
    return this.agent.run({
      query,
      maxPlanSize,
      maxStepIterations,
      signal,
    });
  }
}
