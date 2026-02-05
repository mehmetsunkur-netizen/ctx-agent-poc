import { CLIFlags } from "@/cli";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentError,
  Answer,
  CTXAgentStatusHandler,
  ContextEngineAgent,
  Evaluation,
  getToolParamsSymbol,
  LLMFactory,
  Outcome,
  Step,
  ToolCall,
} from "@ctx-agent/ctx-agent";
import { DebugStatusHandler, DebugOptions } from "@/debug-status-handler";

export interface ToolResultEntry {
  toolName: string;
  timestamp: number;
  result: string;
  preview: string;
}

export function useAgent({
  query,
  flags,
}: {
  query: string;
  flags: CLIFlags;
}) {
  const [appStatus, setAppStatus] = useState<string>("");
  const [queryPlan, setQueryPlan] = useState<Step[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<ToolResultEntry[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debugHandlerRef = useRef<DebugStatusHandler | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    class CLIStatusHandler implements CTXAgentStatusHandler {
      onPlanUpdate(queryPlan: Step[]) {
        setQueryPlan([...queryPlan]);
      }

      onAssistantUpdate(message: string) {
        setAssistantMessages((prevMessages) => [...prevMessages, message]);
      }

      onToolCall(args: {
        toolCall: ToolCall;
        toolParams: any;
        reason?: string;
      }) {
        const message = `I am calling ${args.toolCall.name}(${getToolParamsSymbol(args.toolParams)})\n${args.reason ? args.reason : ""}`;
        setAssistantMessages((prevMessages) => [...prevMessages, message]);
      }

      onToolResult(result: unknown, toolCall?: ToolCall) {
        if (flags.verbose) {
          const formatted =
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2);

          // Create preview (first 500 chars)
          const preview =
            formatted.length > 500
              ? formatted.slice(0, 500) + "..."
              : formatted;

          setToolResults((prev) => [
            ...prev,
            {
              toolName: toolCall?.name || "unknown",
              timestamp: Date.now(),
              result: formatted,
              preview,
            },
          ]);
        }
      }

      onStepOutcome(outcome: Outcome) {
        setAssistantMessages((prevMessages) => [
          ...prevMessages,
          outcome.summary,
        ]);
      }

      onPlanEvaluation(evaluation: Evaluation) {
        setAssistantMessages((prevMessages) => [
          ...prevMessages,
          evaluation.reason,
        ]);
      }
    }

    async function runAgent() {
      setAppStatus("Initializing...");

      // TODO: remove hardcoded provider model
      const provider = flags.provider || "openai";
      const model = flags.model || "gpt-4o-mini";
      const maxPlanSize = flags.maxPlanSize;

      const cliStatusHandler = new CLIStatusHandler();

      // Wrap with debug handler if verbose or debug file is specified
      let statusHandler: CTXAgentStatusHandler = cliStatusHandler;

      if (flags.verbose || flags.debugFile) {
        const debugOptions: DebugOptions = {
          verbose: flags.verbose || false,
          showToolResults: flags.verbose || false,
          logToFile: !!flags.debugFile,
          filePath: flags.debugFile,
        };

        const debugHandler = new DebugStatusHandler(
          cliStatusHandler,
          debugOptions
        );
        statusHandler = debugHandler;
        debugHandlerRef.current = debugHandler;
      }

      try {
        setAppStatus("Connecting to ChromaDB...");

        const agent = await ContextEngineAgent.create({
          llmConfig: {
            provider: LLMFactory.parseLLMProvider(provider),
            model,
          },
          statusHandler,
        });

        setAppStatus("Processing query...");

        const finalAnswer = await agent.answer({
          query,
          maxPlanSize,
          signal: abortController.signal,
        });

        setResult(finalAnswer);
        setAppStatus("Done!");

        // Flush debug logs on success
        if (debugHandlerRef.current) {
          await debugHandlerRef.current.flush();
        }
      } catch (error) {
        // Flush debug logs on error too
        if (debugHandlerRef.current) {
          await debugHandlerRef.current.flush();
        }
        throw error;
      }
    }

    runAgent().catch((error) => {
      if (abortController.signal.aborted) {
        return;
      }
      const message =
        error instanceof AgentError
          ? `${error.message}. ${error.cause instanceof Error ? error.cause.message : ""}`
          : "Unknown error";
      setError(message);
    });

    return () => {
      abortController.abort();
    };
  }, [query, flags]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    appStatus,
    queryPlan,
    assistantMessages,
    result,
    error,
    toolResults,
    cancel,
  };
}
