# CTX-Agent

An agentic search tool for testing and validating non-technical organizational context collections created by [org-ctx-layer](https://github.com/isara/org-ctx-layer). Queries Slack, Notion, and other organizational data sources using AI-powered semantic search.

## Purpose

CTX-Agent validates that org-ctx-layer successfully ingested and indexed organizational context into ChromaDB. It provides an interactive agent that plans queries, executes searches, and synthesizes answers grounded in your organizational data.

**Scope**: Non-technical organizational content (Slack, Notion, company docs)
**Out of Scope**: Technical data (code, PRs, issues) - use [code-search](../code-search) for that

## Prerequisites

- Node.js 18+
- pnpm
- org-ctx-layer must have created ChromaDB collections
- **Either**: ChromaDB running with indexed collections
- **Or**: org-ctx-layer's HTTP search API running
- OpenAI API key (or compatible LLM endpoint)

## Quick Start

1. **Install dependencies** (from monorepo root):
   ```bash
   pnpm install
   ```

2. **Configure environment** - Create `.env` in `ctx-agent/`:
   ```bash
   # Backend Selection
   SEARCH_BACKEND=chroma  # or "http"

   # ChromaDB Backend (direct access)
   CHROMA_HOST=localhost
   CHROMA_PORT=8000

   # HTTP Backend (via org-ctx-layer API)
   # SEARCH_API_URL=http://localhost:3059
   # SEARCH_TIMEOUT_MS=30000

   # LLM Configuration
   OPENAI_API_KEY=your-api-key-here
   ```

3. **Run a query**:
   ```bash
   cd ctx-agent
   pnpm cli:dev "What development process should engineers follow?"
   ```

## CLI Usage

```bash
$ ctx-agent "<your question>" [options]

Options:
  --provider, -p         LLM provider (default: openai)
  --model, -m            Model name (default: gpt-4o-mini)
  --source, -s           Data source or group to query
                         (Default: from DEFAULT_SOURCE env var or "org-data")
  --list-sources         List all available data sources and groups
  --max-plan-size        Max steps in query plan (default: 10)
  --max-step-iterations  Max iterations per step (default: 5)
  --verbose, -v          Show detailed debug information
  --debug-file           Path to JSON debug log file

Examples:
  # Use default source (org-data: slack + notion)
  pnpm cli:dev "What is our vacation policy?"

  # Query specific source
  pnpm cli:dev "What tools do engineers use?" --source slack
  pnpm cli:dev "What are our design principles?" --source notion

  # Query source group
  pnpm cli:dev "What development processes do we follow?" --source org-data

  # List available sources
  pnpm cli:dev --list-sources

  # Other options
  pnpm cli:dev "How do we handle escalations?" -m gpt-4o --verbose
```

### Source Selection

By default, ctx-agent queries the **org-data** group, which includes non-technical organizational context (Slack + Notion). This aligns with ctx-agent's purpose: validating organizational data ingested by org-ctx-layer.

**Fallback chain** when no `--source` is specified:
1. **CLI flag**: `--source notion` (highest priority)
2. **Environment variable**: `DEFAULT_SOURCE=slack`
3. **Hardcoded default**: `org-data` (slack + notion)

To see what sources are available:
```bash
pnpm cli:dev --list-sources
```

## Search Backend Architecture

CTX-Agent supports two backend implementations with full feature parity:

### ChromaDB Backend (Default)
Direct connection to ChromaDB for development and trusted environments:
- Maximum performance (no network overhead for vector queries)
- Requires direct ChromaDB access
- **Supports source groups** via org-ctx-layer API for metadata
- Queries multiple collections in parallel and merges results

```bash
SEARCH_BACKEND=chroma
CHROMA_HOST=localhost
CHROMA_PORT=8000
ORG_CTX_LAYER_API_URL=http://localhost:3059  # For group resolution
```

### HTTP Backend
Routes queries through org-ctx-layer's HTTP API for production deployments:
- **Security boundary**: Restricts direct database access
- Enables authentication, rate-limiting, audit logging
- Multi-tenant ready
- **Supports source groups** natively via API

```bash
SEARCH_BACKEND=http
SEARCH_API_URL=http://localhost:3059
SEARCH_TIMEOUT_MS=30000
```

**Feature Comparison**:

| Feature | HTTP Backend | ChromaDB Backend |
|---------|--------------|------------------|
| Individual Sources | ✅ | ✅ |
| Source Groups | ✅ | ✅ |
| Multi-Collection | ✅ | ✅ |
| Authentication | ✅ | ❌ |
| Direct DB Access | ❌ | ✅ |
| Group Metadata | Native | Via API |

Both backends support the full CLI interface including `--source` flag and `--list-sources`.

## How It Works

CTX-Agent uses a three-stage agentic loop:

1. **Planning**: LLM decomposes your question into logical search steps
2. **Execution**: Agent executes semantic searches against org-ctx-layer collections
3. **Evaluation**: Assesses progress, decides whether to continue, finalize, or replan
4. **Answer**: Synthesizes results into a coherent answer with source references

## Project Structure

```
ctx-agent/
├── packages/
│   ├── ctx-agent/              # Core agent implementation
│   │   └── src/
│   │       ├── agent.ts        # ContextEngineAgent class
│   │       ├── backends/       # ChromaDB and HTTP backends
│   │       ├── tools/          # Semantic search tools
│   │       ├── schemas.ts      # Zod schemas for steps/outcomes
│   │       └── prompts.ts      # LLM prompts
│   └── cli/                    # Terminal UI
│       └── src/
│           ├── main.tsx        # Entry point
│           └── cli.ts          # Argument parsing
├── package.json
└── .env.example
```

## Using Makefile

The included Makefile provides convenient shortcuts:

```bash
make install    # Install dependencies
make build      # Build all packages
make run        # Run with default query
make clean      # Clean build artifacts

# Custom queries
make run QUERY="What is our code review process?" MODEL=gpt-4o

# Use HTTP backend
make run SEARCH_BACKEND=http SEARCH_API_URL=http://localhost:3059
```

## Relationship to Other Tools

- **org-ctx-layer**: Creates and manages ChromaDB collections (prerequisite)
- **code-search**: Validates technical data (code/PRs/issues) - separate tool
- **agent-framework**: Shared agentic loop implementation

## Troubleshooting

**Agent creation fails with ChromaDB connection error**:
- Verify ChromaDB is running: `curl http://localhost:8000/api/v1/heartbeat`
- Check `CHROMA_HOST` and `CHROMA_PORT` in `.env`
- Ensure org-ctx-layer has created collections

**Agent creation fails with HTTP backend error**:
- Verify org-ctx-layer's HTTP API is running: `curl http://localhost:3059/api/health`
- Check `SEARCH_API_URL` in `.env`
- Increase timeout if needed: `SEARCH_TIMEOUT_MS=60000`

**No search results returned**:
- Verify org-ctx-layer has indexed data
- Check that collections exist in ChromaDB
- Try a broader query

**Multi-source queries fail with ChromaDB backend**:
- Verify org-ctx-layer's HTTP API is running: `curl http://localhost:3059/api/health`
- Check `ORG_CTX_LAYER_API_URL` in `.env`
- ChromaDB backend needs API access for group metadata
- Ensure all source collections exist in ChromaDB

## Development

Built with:
- TypeScript + ES Modules
- [agent-framework](../agent-framework) for agentic loop
- Zod for schema validation
- Ink for terminal UI
- ChromaDB for vector storage

