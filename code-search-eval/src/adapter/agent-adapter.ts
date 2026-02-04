/**
 * Agent Adapter Interface
 *
 * Defines the contract for all agent implementations to enable
 * evaluation of multiple agents using the same framework.
 */

export interface AgentAdapter {
  /**
   * Run the agent with the given query and configuration
   * @param config - Configuration for the agent run
   * @returns Promise resolving to the agent's result
   */
  run(config: {
    query: string;
    maxPlanSize?: number;
    maxStepIterations?: number;
    signal: AbortSignal;
  }): Promise<AgentResult>;
}

export interface AgentResult {
  /** The agent's answer to the query */
  answer: string;
  /** The agent's reasoning or explanation (may be empty for some agents) */
  reason: string;
}

export interface AgentFactory {
  /**
   * Create an instance of the agent adapter
   * @param config - Configuration for creating the agent
   * @returns Promise resolving to an AgentAdapter instance
   */
  create(config: {
    path: string;
    llmConfig: any;
  }): Promise<AgentAdapter>;
}
