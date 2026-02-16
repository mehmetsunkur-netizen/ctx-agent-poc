import meow from "meow";

const helpText = `
    Usage:
        $ code-search <query> [options]

    Arguments:
        query                  The question to ask about the codebase

    Options:
        --collection, -c       ChromaDB collection name to query (required)
                               The collection must be indexed first

        --repository-path      Optional repository path for context (enables file listing)

        --provider             Specify the LLM provider to use (Default: openai)

        --model, -m            Specify the model to use from your provider
                               (Default: gpt-4o-mini)

        --max-plan-size        Set the max number of steps in the query plan
                               (Default: 10)

        --max-step-iterations  Set the max number of iterations for each step
                               (Default: 5)

    Environment Variables:
        CHROMA_COLLECTION      Default collection if --collection not specified
        CHROMA_HOST            ChromaDB host (Default: localhost)
        CHROMA_PORT            ChromaDB port (Default: 8000)

    Examples:
        # Query indexed repository
        $ code-search "How is authentication implemented?" --collection backend-repo

        # With custom model
        $ code-search "Where is the database configured?" -c backend-repo -m gpt-4o

        # Using environment variable
        $ export CHROMA_COLLECTION=backend-repo
        $ code-search "What does the UserService do?"

    Note:
        Before querying, you must index your repository:
        $ pnpm index /path/to/repo --collection backend-repo

        See README for more information.
`;

export const cli = meow(helpText, {
  importMeta: import.meta,
  flags: {
    collection: {
      type: "string",
      shortFlag: "c",
    },
    repositoryPath: {
      type: "string",
    },
    provider: {
      type: "string",
    },
    model: {
      type: "string",
      shortFlag: "m",
    },
    maxPlanSize: {
      type: "number",
    },
    maxStepIterations: {
      type: "number",
    },
  },
});

export type CLIFlags = typeof cli.flags;
