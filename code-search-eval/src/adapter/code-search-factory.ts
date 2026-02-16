/**
 * Code-Search Agent Factory
 *
 * Wrapper for the existing CodeSearchAgent to make it compatible
 * with the AgentAdapter interface without modifying its code.
 */

import path from 'path';
import { CodeSearchAgent } from '@isara-ctx/code-agent';
import type { AgentAdapter, AgentResult, AgentFactory } from './agent-adapter.js';

class CodeSearchAdapterWrapper implements AgentAdapter {
  constructor(private agent: CodeSearchAgent) {}

  async run(config: {
    query: string;
    maxPlanSize?: number;
    maxStepIterations?: number;
    signal: AbortSignal;
  }): Promise<AgentResult> {
    const result = await this.agent.run({
      query: config.query,
      maxPlanSize: config.maxPlanSize || 10,
      maxStepIterations: config.maxStepIterations || 5,
      signal: config.signal,
    });

    return {
      answer: result.answer,
      reason: result.reason,
    };
  }
}

export class CodeSearchAgentFactory implements AgentFactory {
  /**
   * Derive collection name from repository path
   * Matches the naming convention used by Indexer
   */
  private deriveCollectionName(repoPath: string): string {
    const repoName = path.basename(repoPath);
    const sanitized = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `repo-${sanitized}`;
  }

  async create(config: { path: string; llmConfig: any }): Promise<AgentAdapter> {
    const collectionName = this.deriveCollectionName(config.path);

    const agent = await CodeSearchAgent.create({
      collectionName,
      repositoryPath: config.path,
      llmConfig: config.llmConfig,
    });
    return new CodeSearchAdapterWrapper(agent);
  }
}
