import { CLIFlags } from "@/cli";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CodeSearchAgent,
  CodeSearchAgentStatusHandler,
  Answer,
  Step,
  Outcome,
  Evaluation,
} from "@isara-ctx/code-agent";
import {
  AgentError,
  getToolParamsSymbol,
  LLMFactory,
  ToolCall,
} from "@isara-ctx/agent-framework";

export function useAgent({
  query,
  flags,
}: {
  query: string;
  flags: CLIFlags;
}) {
  const [appStatus, setAppStatus] = useState<string>("Initializing...");
  const [queryPlan, setQueryPlan] = useState<Step[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    class CLIStatusHandler implements CodeSearchAgentStatusHandler {
      onIndex() {
        // Deprecated: No longer called (indexing removed)
        setAppStatus("Loading collection...");
      }

      onPlanUpdate(queryPlan: Step[]) {
        setAppStatus("Executing plan...");
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
        const message = `Calling ${args.toolCall.name}(${getToolParamsSymbol(args.toolParams)})${args.reason ? `\n${args.reason}` : ""}`;
        setAssistantMessages((prevMessages) => [...prevMessages, message]);
      }

      onStepOutcome(outcome: Outcome) {
        setAssistantMessages((prevMessages) => [
          ...prevMessages,
          outcome.summary,
        ]);
      }

      onPlanEvaluation(evaluation: any) {
        setAssistantMessages((prevMessages) => [
          ...prevMessages,
          evaluation.reason,
        ]);
      }
    }

    async function runAgent() {
      const provider = flags.provider || "openai";
      const model = flags.model || "gpt-4o-mini";
      const collectionName = flags.collection || process.env.CHROMA_COLLECTION;
      const repositoryPath = flags.repositoryPath;
      const maxPlanSize = flags.maxPlanSize;
      const maxStepIterations = flags.maxStepIterations;

      if (!collectionName) {
        throw new AgentError(
          "Collection name required. Use --collection flag or set CHROMA_COLLECTION environment variable.\n\n" +
          "Before querying, index your repository:\n" +
          "  pnpm index /path/to/repo --collection my-repo"
        );
      }

      setAppStatus(`Connecting to collection: ${collectionName}...`);

      const cliStatusHandler = new CLIStatusHandler();

      const agent = await CodeSearchAgent.create({
        collectionName,
        repositoryPath,
        llmConfig: {
          provider: LLMFactory.parseLLMProvider(provider),
          model,
        },
        statusHandler: cliStatusHandler,
      });

      // Show collection info
      const info = await agent.getCollectionInfo();
      setAppStatus(`Querying ${info.name} (${info.count} documents)...`);

      const finalAnswer = await agent.run({
        query,
        maxPlanSize,
        maxStepIterations,
        signal: abortController.signal,
      });

      setResult(finalAnswer);
      setAppStatus("Done!");
    }

    runAgent().catch((error) => {
      if (abortController.signal.aborted) {
        return;
      }
      const message =
        error instanceof AgentError
          ? `${error.message}${error.cause instanceof Error ? `. ${error.cause.message}` : ""}`
          : error instanceof Error
            ? error.message
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
    query,
    queryPlan,
    assistantMessages,
    result,
    error,
    cancel,
  };
}
