import React from "react";
import { Text, Box, Newline, useInput, useApp } from "ink";
import {
  Answer,
  BaseStepStatus,
  getStatusSymbol,
  Step,
} from "@ctx-agent/ctx-agent";
import { ToolResultEntry } from "@/hooks/use-agent";

interface CLIProps {
  appStatus: string;
  query: string;
  plan: Step[];
  assistantMessages: string[];
  result: Answer | null;
  error: string | null;
  toolResults?: ToolResultEntry[];
  verbose?: boolean;
  cancel: () => void;
}

export function CLIView({
  appStatus,
  query,
  plan,
  assistantMessages,
  result,
  error,
  toolResults = [],
  verbose = false,
  cancel,
}: CLIProps) {
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") {
      cancel();
      exit();
    }
  });

  const lastMessages = assistantMessages.slice(-1);

  return (
    <Box padding={1} flexDirection="column">
      <Text color="cyan">CTX-Agent CLI</Text>
      <Text color="gray">Status: {appStatus}</Text>
      <Newline />

      {query && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Query:</Text>
          <Text>{query}</Text>
        </Box>
      )}

      {plan.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Query Plan:</Text>
          {plan.map((step) => (
            <Text
              key={step.id}
              strikethrough={step.status === BaseStepStatus.Cancelled}
              dimColor={step.status === BaseStepStatus.Cancelled}
            >
              {getStatusSymbol(step.status)} {step.title}
            </Text>
          ))}
        </Box>
      )}

      {lastMessages.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Agent Thoughts:</Text>
          {lastMessages.map((msg, index) => (
            <Text key={index} dimColor>
              {`> ${msg}`}
            </Text>
          ))}
        </Box>
      )}

      {verbose && toolResults.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            Tool Execution Summary:
          </Text>
          {(() => {
            // Calculate tool counts by type
            const toolCounts = toolResults.reduce((acc, entry) => {
              acc[entry.toolName] = (acc[entry.toolName] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // Calculate total duration
            const firstTimestamp = toolResults[0]?.timestamp || 0;
            const lastTimestamp = toolResults[toolResults.length - 1]?.timestamp || 0;
            const durationSeconds = ((lastTimestamp - firstTimestamp) / 1000).toFixed(1);

            return (
              <Box flexDirection="column" marginLeft={2}>
                {Object.entries(toolCounts).map(([name, count]) => (
                  <Text key={name} dimColor>
                    <Text color="yellow">{name}</Text>: {count} call{count > 1 ? 's' : ''}
                  </Text>
                ))}
                <Text dimColor>
                  Total: {toolResults.length} call{toolResults.length > 1 ? 's' : ''} in {durationSeconds}s
                </Text>
              </Box>
            );
          })()}

          {toolResults.length > 5 && (
            <Box marginTop={1} marginLeft={2}>
              <Text bold color="cyan">
                Recent Tool Calls (last 5 of {toolResults.length}):
              </Text>
            </Box>
          )}
          {toolResults.length <= 5 && toolResults.length > 0 && (
            <Box marginTop={1} marginLeft={2}>
              <Text bold color="cyan">
                Recent Tool Calls:
              </Text>
            </Box>
          )}

          {toolResults.slice(-5).map((entry, i) => (
            <Box key={i} flexDirection="column" marginLeft={2} marginTop={1}>
              <Text>
                <Text color="yellow">{entry.toolName}</Text>
                <Text dimColor>
                  {" "}
                  ({new Date(entry.timestamp).toLocaleTimeString()})
                </Text>
              </Text>
              <Box flexDirection="column" marginLeft={2}>
                <Text dimColor>{entry.preview}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {result && (
        <Box flexDirection="column" borderStyle="round" padding={1}>
          <Text color="green" bold>
            Final Answer:
          </Text>
          <Text>{result.answer}</Text>
          <Text color="gray">Confidence: {result.confidence * 100}%</Text>
          <Text color="gray">Reason: {result.reason}</Text>
          <Text color="gray">Evidence: {result.evidence.join(", ")}</Text>
        </Box>
      )}

      {error && (
        <Box borderStyle="round" padding={1} flexDirection="column">
          <Text color="red" bold>
            Error
          </Text>
          <Text>{error}</Text>
        </Box>
      )}

      <Newline />
      {appStatus !== "Done!" && !error && <Text color="gray">Running...</Text>}
      <Text color="gray">Press 'q' to quit</Text>
    </Box>
  );
}
