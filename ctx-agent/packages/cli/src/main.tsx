#!/usr/bin/env node

import { cli, CLIFlags } from "@/cli";
import { useAgent } from "@/hooks/use-agent";
import { CLIView } from "@/components/cli-view";
import { render } from "ink";
import { configResult } from "@/config";
import { ConfigError } from "@/components/config-error";
import { createSearchBackend } from "@ctx-agent/ctx-agent";

function App({ query, flags }: { query: string; flags: CLIFlags }) {
  const { appStatus, queryPlan, assistantMessages, result, error, toolResults, cancel } =
    useAgent({
      query,
      flags,
    });

  return (
    <CLIView
      appStatus={appStatus}
      query={query}
      plan={queryPlan}
      assistantMessages={assistantMessages}
      result={result}
      error={error}
      toolResults={toolResults}
      verbose={flags.verbose}
      cancel={cancel}
    />
  );
}

async function listSources() {
  try {
    console.log("\n🔍 Fetching available sources...\n");
    const backend = await createSearchBackend();
    const sources = await backend.listSources();

    const groups = sources.filter((s) => s.type === "group");
    const individualSources = sources.filter((s) => s.type === "source");

    if (groups.length > 0) {
      console.log("📁 Groups:");
      for (const group of groups) {
        const desc = group.description ? ` - ${group.description}` : "";
        console.log(`  ${group.name.padEnd(18)} ${group.displayName}${desc}`);
        if (group.sources) {
          console.log(`  ${"".padEnd(18)} └─ ${group.sources}`);
        }
      }
      console.log();
    }

    if (individualSources.length > 0) {
      console.log("📄 Sources:");
      for (const source of individualSources) {
        const desc = source.description ? ` - ${source.description}` : "";
        console.log(`  ${source.name.padEnd(18)} ${source.displayName}${desc}`);
      }
      console.log();
    }

    if (sources.length === 0) {
      console.log("⚠️  No sources available. Check org-ctx-layer configuration.\n");
      process.exit(1);
    }

    const defaultSource = process.env.DEFAULT_SOURCE || "org-data";
    console.log(`💡 Default source: ${defaultSource}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to list sources:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Handle --list-sources flag
if (cli.flags.listSources) {
  await listSources();
} else if (cli.input.length === 0) {
  cli.showHelp(0);
} else if (!configResult.success) {
  render(<ConfigError issues={configResult.error.issues} />);
} else {
  render(<App query={cli.input[0]} flags={cli.flags} />);
}
