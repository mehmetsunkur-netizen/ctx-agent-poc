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
import { Collection } from "chromadb";
import {
  CTXAgentConsoleStatusHandler,
  CTXAgentStatusHandler,
} from "./status-handler";
import { bcpAgentPrompts } from "./prompts";
import { searchToolsFactory } from "./tools";
import { getContextEngineCollection } from "./chroma";
import { CTXAgentConfig, CTXAgentRunConfig } from "./types";

export class ContextEngineAgent {
  private static MAX_PLAN_SIZE = 10;
  private static MAX_STEP_ITERATIONS = 5;

  private readonly contextEngineCollection: Collection;
  private agent: BaseAgent<BCPAgentTypes, BaseAgentServices<BCPAgentTypes>>;
  private statusHandler: CTXAgentStatusHandler | undefined;

  protected constructor({
    llmConfig,
    collection,
    statusHandler,
  }: CTXAgentConfig) {
    this.contextEngineCollection = collection;
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
      tools: searchToolsFactory(this.contextEngineCollection),
    });
  }

  static async create(config: Omit<CTXAgentConfig, "collection">) {
    const collection = await getContextEngineCollection();
    return new ContextEngineAgent({
      collection,
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
