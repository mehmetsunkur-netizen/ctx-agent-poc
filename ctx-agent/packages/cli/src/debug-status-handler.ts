import type { Step, Outcome, Answer, Evaluation, ToolCall } from "@ctx-agent/ctx-agent";
import type { AgentStatusHandler } from "@isara-ctx/agent-framework";
import type { BCPAgentTypes } from "@ctx-agent/ctx-agent";
import fs from "fs/promises";
import { dirname } from "path";

export interface DebugOptions {
  verbose: boolean;
  showToolResults: boolean;
  logToFile: boolean;
  filePath?: string;
}

interface DebugLogEntry {
  timestamp: number;
  event: string;
  data: any;
}

/**
 * DebugStatusHandler wraps another status handler and adds debug logging capabilities.
 * It can log to console (if verbose) and/or to a JSON file.
 */
export class DebugStatusHandler implements AgentStatusHandler<BCPAgentTypes> {
  private logs: DebugLogEntry[] = [];
  private startTime: number;

  constructor(
    private wrapped: AgentStatusHandler<BCPAgentTypes>,
    private options: DebugOptions
  ) {
    this.startTime = Date.now();
  }

  onAssistantUpdate(message: string) {
    this.log("assistant_update", { message });

    if (this.options.verbose) {
      console.log(`[DEBUG] Assistant: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`);
    }

    this.wrapped.onAssistantUpdate?.(message);
  }

  onPlanUpdate(plan: Step[]) {
    this.log("plan_update", {
      stepCount: plan.length,
      steps: plan.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
      })),
    });

    if (this.options.verbose) {
      console.log(`[DEBUG] Plan Update: ${plan.length} steps`);
    }

    this.wrapped.onPlanUpdate?.(plan);
  }

  onToolCall(args: {
    toolCall: ToolCall;
    toolParams: any;
    reason?: string;
  }) {
    this.log("tool_call", {
      toolName: args.toolCall.name,
      toolId: args.toolCall.id,
      params: args.toolParams,
      reason: args.reason,
    });

    if (this.options.verbose) {
      console.log(`[DEBUG] Tool Call: ${args.toolCall.name}`, {
        params: JSON.stringify(args.toolParams).slice(0, 200),
      });
    }

    this.wrapped.onToolCall?.(args);
  }

  onToolResult(result: unknown, toolCall?: ToolCall) {
    const resultStr = typeof result === "string"
      ? result
      : JSON.stringify(result);

    this.log("tool_result", {
      toolName: toolCall?.name,
      toolId: toolCall?.id,
      result: result,
      resultLength: resultStr.length,
    });

    if (this.options.verbose && this.options.showToolResults) {
      const preview = resultStr.length > 300
        ? resultStr.slice(0, 300) + "..."
        : resultStr;
      console.log(`[DEBUG] Tool Result (${toolCall?.name}):`, preview);
    }

    this.wrapped.onToolResult?.(result, toolCall);
  }

  onStepOutcome(outcome: Outcome) {
    this.log("step_outcome", {
      status: outcome.status,
      summary: outcome.summary,
    });

    if (this.options.verbose) {
      console.log(`[DEBUG] Step Outcome: ${outcome.status}`, {
        summary: outcome.summary.slice(0, 100),
      });
    }

    this.wrapped.onStepOutcome?.(outcome);
  }

  onPlanEvaluation(evaluation: Evaluation) {
    this.log("plan_evaluation", {
      decision: evaluation.decision,
      reason: evaluation.reason,
    });

    if (this.options.verbose) {
      console.log(`[DEBUG] Plan Evaluation: ${evaluation.decision}`);
    }

    this.wrapped.onPlanEvaluation?.(evaluation);
  }

  onFinalAnswer(answer: Answer) {
    this.log("final_answer", {
      answer: answer.answer,
      confidence: answer.confidence,
      reason: answer.reason,
      evidenceCount: answer.evidence.length,
    });

    if (this.options.verbose) {
      console.log(`[DEBUG] Final Answer: confidence=${answer.confidence}`);
    }

    this.wrapped.onFinalAnswer?.(answer);
  }

  private log(event: string, data: any) {
    if (this.options.logToFile) {
      this.logs.push({
        timestamp: Date.now(),
        event,
        data,
      });
    }
  }

  /**
   * Write all collected logs to the debug file.
   * Should be called when agent execution completes or errors.
   */
  async flush() {
    if (!this.options.logToFile || !this.options.filePath) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = dirname(this.options.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Calculate execution duration
      const endTime = Date.now();
      const duration = endTime - this.startTime;

      // Write logs with metadata
      const output = {
        metadata: {
          generatedAt: new Date().toISOString(),
          startTime: new Date(this.startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: `${duration}ms`,
          totalLogs: this.logs.length,
          eventTypes: this.getEventTypeSummary(),
        },
        logs: this.logs,
      };

      await fs.writeFile(
        this.options.filePath,
        JSON.stringify(output, null, 2)
      );

      console.log(`\n✓ Debug log written to: ${this.options.filePath}`);
      console.log(`  Total events: ${this.logs.length}`);
      console.log(`  Duration: ${duration}ms`);
    } catch (err) {
      console.error("\n✗ Failed to write debug log file:", err);
      if (err instanceof Error) {
        console.error(`  Error: ${err.message}`);
      }
    }
  }

  /**
   * Get a summary of event types in the logs.
   */
  private getEventTypeSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const log of this.logs) {
      summary[log.event] = (summary[log.event] || 0) + 1;
    }
    return summary;
  }

  /**
   * Get the current log count.
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Clear all collected logs.
   */
  clear() {
    this.logs = [];
  }
}
