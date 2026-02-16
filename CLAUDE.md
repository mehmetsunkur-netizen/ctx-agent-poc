# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo demonstrating agentic AI systems built on a general-purpose agent framework. The repo uses **pnpm workspaces** and TypeScript project references for managing multiple interdependent packages.

The main components are:
- **agent-framework**: Core agentic loop implementation (domain-agnostic)
- **code-search**: Natural language code search agent with Git-based indexing
- **ctx-agent**: Context-aware agent for organizational knowledge bases

## Build and Development Commands

```bash
# Install dependencies (from root)
pnpm install

# Build all packages
pnpm -r build

# Build specific workspace
pnpm --filter @isara-ctx/agent-framework build
pnpm --filter @isara-ctx/code-agent build
pnpm --filter @isara-ctx/ctx-agent build

# Run code-search CLI (from code-search/packages/cli)
cd code-search/packages/cli
pnpm dev "How is authentication implemented?" --path /path/to/repo

# Example: Search this project
cd code-search/packages/cli
pnpm dev "What does BaseAgent do?" --path ../../../agent-framework
```

## Architecture

### Agent Framework (`agent-framework/`)

The core framework implements a three-stage agentic loop:

1. **Planning** (`BasePlanner`): Decomposes user queries into multi-step plans
2. **Execution** (`BaseExecutor`): Manages tool definitions, invocations, and result processing
3. **Evaluation** (`BaseEvaluator`): Assesses progress after each step, decides whether to continue, finalize, or replan

**Key architectural patterns:**

- **Component-based design**: All components (`BasePlanner`, `BaseExecutor`, `BaseEvaluator`) inherit from `BaseComponent` and have access to shared services (LLM, input/output handlers, prompts, status handlers)
- **Type-safe schemas**: Uses Zod schemas throughout for runtime validation of plans, steps, evaluations, and answers
- **Service injection**: Components receive services (LLM, prompts, I/O handlers) through dependency injection via `BaseComponentConfig`
- **State management**:
  - `Context`: Maintains execution state (current plan, history, memory)
  - `Memory`: Optional persistent memory across runs (includes memory-specific tools if enabled)
- **Tool system**: Tools are defined with Zod schemas and executed dynamically via `ToolFactory`

**Directory structure:**
```
agent-framework/src/
├── agent/           # BaseAgent orchestrator, schemas, types
├── components/      # Planner, Executor, Evaluator
├── services/        # LLM providers, prompts, I/O handlers
├── states/          # Context and Memory management
└── utils/           # Chroma utilities
```

### Code Search (`code-search/`)

Natural language code search using agentic AI with incremental Git-based indexing:

**packages/code-agent**:
- `CodeSearchAgent`: Configures `BaseAgent` for code search tasks
- Tree-sitter-based code parsing and semantic chunking
- Incremental indexing with Git diff tracking (per-commit collections)
- Search tools: semantic (vector), symbol (exact match), regex (pattern), file operations
- Currently supports TypeScript/TSX (extensible to other languages)

**packages/cli**:
- Interactive terminal UI for code search queries
- Automatic repository indexing on first run
- Displays search results with file references and line numbers

**Key features**:
- Respects `.gitignore` during indexing
- Incremental updates based on Git commits
- Working tree ("dirty") support for uncommitted changes
- Preserves code structure (functions, classes, interfaces) as semantic units
- ChromaDB vector storage with OpenAI embeddings

## Environment Configuration

Required environment variables:

**For code-search and ctx-agent** (create `.env` in respective directories):
```
# ChromaDB Configuration
CHROMA_MODE=local
CHROMA_HOST=chroma
CHROMA_PORT=8000
CHROMA_DATABASE=dev-code-search

# Embedding Provider
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=all-minilm:l6-v2

# LLM Provider
OPENAI_BASE_URL=http://127.0.0.1:2141/v1
OPENAI_API_KEY=dummy
```

## TypeScript Configuration

- Uses ES2022 module system with ESM (`"type": "module"` in package.json)
- Project references between workspaces for incremental builds
- Workspace dependencies use `workspace:*` protocol
- Path aliases: `@isara-ctx/agent-framework` resolves to `../agent-framework/src` in TypeScript configs

## Extending the Framework

To create a new agent using the framework:

1. Define custom schemas (step, outcome, answer) extending base types
2. Implement domain-specific tools as functions with Zod schemas
3. Configure prompts for your use case
4. Instantiate `BaseAgent.create()` with your schemas, tools, and services
5. Optionally override component factories (planner/executor/evaluator) for custom behavior

Example pattern:
```typescript
this.agent = BaseAgent.create({
  llmConfig: {...},
  schemas: { step, outcome, answer },
  services: { statusHandler, prompts },
  tools: toolsFactory(collection),
});
```

## Important Implementation Details

- The framework uses AbortSignal for cancellation throughout the agentic loop
- Components communicate via shared `Context` object containing plan, history, and memory
- LLM responses are validated against Zod schemas with structured output parsing
- Tools receive context and can access previous execution history
- The evaluator can override plans mid-execution based on new information
