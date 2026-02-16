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

  /**
   * Get optional source guidance from backend.
   * This enhances generic prompts with deployment-specific source information.
   */
  private async getSourceGuidance(): Promise<string> {
    try {
      const sources = await this.searchBackend.listSources();

      if (sources.length === 0) {
        return "";
      }

      const sourceList = sources
        .map((s) => {
          const desc = s.description ? ` - ${s.description}` : "";
          return `  - ${s.displayName} (${s.type})${desc}`;
        })
        .join("\n");

      return `

Available sources in this knowledge base:
${sourceList}

Consider which sources are most relevant for your query type when planning searches.`;
    } catch (error) {
      // Backend might not support listSources yet, or it failed
      // Gracefully fall back to generic prompts without source info
      return "";
    }
  }

  async answer({
    query,
    source,
    maxPlanSize = ContextEngineAgent.MAX_PLAN_SIZE,
    maxStepIterations = ContextEngineAgent.MAX_STEP_ITERATIONS,
    signal,
  }: CTXAgentRunConfig) {
    // Get optional source guidance
    const sourceGuidance = await this.getSourceGuidance();

    // Enhance prompts with runtime source information if available
    const enhancedPrompts = sourceGuidance
      ? {
          ...ctxAgentPrompts,
          generatePlan: (maxSize: number) => {
            return ctxAgentPrompts.generatePlan(maxSize) + sourceGuidance;
          },
        }
      : ctxAgentPrompts;

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
        prompts: enhancedPrompts,
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
