import meow from "meow";

const helpText = `
    Usage:
        $ ctx-agent "<your question>"

    Options:
        --provider, -p         Specify the provider to use (Default: openai)

        --model, -m            Specify the model to use from your provider
                               (Default: gpt-4o-mini)

        --source, -s           Data source or group to query
                               (Default: from DEFAULT_SOURCE env var or "org-data")

        --list-sources         List all available data sources and groups

        --max-plan-size        Set the max number of steps in the query plan
                               (Default: 10)

        --max-step-iterations  Set the max number of iterations for each step in the query plan
                               (Default: 5)

        --verbose, -v          Show detailed debug information including tool results

        --debug-file           Path to write debug log file (JSON format)

    Examples:
        $ ctx-agent "What is our vacation policy?"
        $ ctx-agent "What tools do engineers use?" --source slack
        $ ctx-agent "What are our processes?" --source org-data
        $ ctx-agent --list-sources
`;

export const cli = meow(helpText, {
  importMeta: import.meta,
  flags: {
    provider: {
      type: "string",
      shortFlag: "p",
    },
    model: {
      type: "string",
      shortFlag: "m",
    },
    source: {
      type: "string",
      shortFlag: "s",
    },
    listSources: {
      type: "boolean",
    },
    maxPlanSize: {
      type: "number",
    },
    maxStepIterations: {
      type: "number",
    },
    verbose: {
      type: "boolean",
      shortFlag: "v",
      default: false,
    },
    debugFile: {
      type: "string",
    },
  },
});

export type CLIFlags = typeof cli.flags;
