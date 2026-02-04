# Code Search Agent Evaluation

A programmatic evaluation system to measure code-search agent accuracy against curated question datasets with known correct answers.

## Features

- **Hybrid Scoring**: Combines file coverage, keyword matching, and LLM-based semantic evaluation
- **LLM-Based File Extraction**: Automatically extracts file references from agent answers using GPT-4o-mini
- **Sequential Execution**: Runs questions one at a time with configurable timeouts
- **Multiple Report Formats**: Generates both JSON and Markdown reports
- **Error Resilience**: Continues evaluation even if individual questions fail
- **Configurable**: Supports configuration files and CLI overrides

## Installation

```bash
# From the root of the monorepo
pnpm install
pnpm --filter @isara-ctx/code-search-eval build
```

## Usage

### Basic Usage

**Using Makefile (Recommended):**

```bash
# Show all available targets
make help

# Run with code-search agent
make eval-code-search

# Run with Codex CLI
make eval-codex

# Run both agents for comparison
make eval-both

# Example: ChromaDB evaluation
make example-chromadb
make example-chromadb-codex
```

**Using pnpm directly:**

```bash
# Run evaluation on a dataset
pnpm --filter @isara-ctx/code-search-eval cli dataset/chromadb-admin-eval.json

# With custom output directory
pnpm --filter @isara-ctx/code-search-eval cli dataset/test.json --output ./custom-results

# Verbose mode
pnpm --filter @isara-ctx/code-search-eval cli dataset/test.json --verbose
```

## Multi-Agent Support

code-search-eval supports evaluating multiple agents with the same datasets and scoring methodology, enabling performance comparisons and baseline establishment.

### Supported Agent Types

#### Code-Search Agent (Default)

The built-in code-search agent with full codebase indexing and semantic search capabilities.

```bash
# Run with code-search agent (default)
pnpm cli dataset/chromadb-admin-eval.json

# Or explicitly specify
pnpm cli dataset/chromadb-admin-eval.json --agent-type code-search
```

#### Codex CLI

OpenAI's Codex CLI tool for code understanding and generation.

**Prerequisites:**
1. Install Codex CLI: `npm install -g @openai/codex`
2. Authenticate: `codex auth login`

**Run evaluation:**
```bash
pnpm cli dataset/chromadb-admin-eval.json --agent-type codex
```

**Using config file:**
```bash
pnpm cli dataset/test.json --config config/codex.json
```

### Agent Selection Priority

Agent type can be specified via:
1. **CLI flag** `--agent-type codex` (highest priority - overrides config)
2. **Config file** `"agent": { "type": "codex" }` (default priority)
3. **Default** `code-search` (fallback if not specified)

### Configuration Examples

**Code-Search Agent (config/default.json):**
```json
{
  "agent": {
    "type": "code-search",
    "llm": {
      "model": "gpt-5.2-2025-12-11"
    },
    "maxPlanSize": 10,
    "maxStepIterations": 5
  }
}
```

**Codex CLI (config/codex.json):**
```json
{
  "agent": {
    "type": "codex",
    "llm": {
      "model": "gpt-5.2-codex"
    },
    "maxPlanSize": 10,
    "maxStepIterations": 5
  }
}
```

Note: `maxPlanSize` and `maxStepIterations` are used by code-search agent only. Codex CLI ignores these parameters.

### Troubleshooting

**Codex not found:**
```bash
npm install -g @openai/codex
# Verify installation
which codex
```

**Codex authentication error:**
```bash
codex auth login
```

**Timeout errors:**
Increase timeout in config:
```json
{
  "runner": {
    "timeout": 240000
  }
}
```

**Agent type validation error:**
Ensure agent type is either `code-search` or `codex`. Check for typos in CLI flags or config file.

### Configuration

Create a config file (e.g., `eval.config.json`):

```json
{
  "scorer": {
    "method": "hybrid",
    "weights": {
      "fileCoverage": 0.2,
      "keywordCoverage": 0.2,
      "semanticQuality": 0.6
    },
    "passThreshold": 70,
    "llmJudge": {
      "enabled": true,
      "model": "gpt-4o-mini",
      "temperature": 0.1
    }
  },
  "agent": {
    "llm": {
      "model": "gpt-4o"
    },
    "maxPlanSize": 10,
    "maxStepIterations": 5
  },
  "runner": {
    "timeout": 120000
  },
  "reporter": {
    "outputDir": "./results"
  }
}
```

Use the config file:

```bash
pnpm cli dataset/test.json --config ./eval.config.json
```

### Environment Variables

Set your OpenAI API key:

```bash
export OPENAI_API_KEY=sk-...
```

## Dataset Format

Datasets must follow the JSON schema in `dataset/code-search-agent-eval.schema.json`.

Example:

```json
{
  "$schema": "./code-search-agent-eval.schema.json",
  "title": "My Code Evaluation",
  "description": "Evaluates knowledge of my codebase",
  "version": "1.0",
  "schemaVersion": "fixed",
  "repo_path": "/absolute/path/to/repository",
  "totalQuestions": 2,
  "questions": [
    {
      "id": 1,
      "difficulty": "Easy",
      "category": "Architecture",
      "question": "How is authentication implemented?",
      "requiredFiles": ["src/auth.ts", "src/middleware/auth.ts"],
      "keywords": ["JWT", "token", "authentication"],
      "answer": "The system uses JWT tokens for authentication..."
    }
  ]
}
```

## Scoring System

### Hybrid Scoring (Default)

The evaluation uses a weighted hybrid scoring approach:

- **File Coverage (20%)**: Measures how many required files are mentioned in the answer
  - Uses LLM (GPT-4o-mini) to extract file paths from answer text
  - Score = (files mentioned / files required)

- **Keyword Coverage (20%)**: Measures presence of expected keywords
  - Uses case-insensitive word boundary matching
  - Score = (keywords found / keywords expected)

- **Semantic Quality (60%)**: LLM judge evaluates answer quality
  - Uses GPT-4o-mini to compare actual vs expected answer
  - Assesses accuracy, completeness, relevance, and clarity
  - Returns score 0-1

**Overall Score**: `(0.2 × file) + (0.2 × keyword) + (0.6 × semantic)` × 100

**Pass Threshold**: 70/100 (configurable)

## Reports

### JSON Report

Full evaluation results with all metrics and answers:

```json
{
  "id": "run-1234567890",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "dataset": "My Code Evaluation",
  "metrics": {
    "overall": 75.5,
    "passRate": 0.7
  },
  "results": [...]
}
```

### Markdown Report

Human-readable report with summary tables and collapsible answer sections.

## CLI Options

```
Usage
  $ code-search-eval <dataset-path>

Options
  --config, -c            Config file path (default: ./eval.config.json)
  --output, -o            Output directory (default: ./results)
  --format, -f            Report formats: json,markdown (default: json,markdown)
  --agent-type, -a        Agent type: code-search, codex (default: code-search)
  --timeout               Timeout per question in milliseconds (default: 120000)
  --max-step-iterations   Max tool call iterations per step (default: 5)
  --max-plan-size         Max number of steps in plan (default: 10)
  --verbose, -v           Verbose logging
  --help                  Show this help message
```

## Exit Codes

- `0`: Evaluation passed (pass rate ≥ 70%)
- `1`: Evaluation failed or error occurred

## Architecture

```
code-search-eval/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── types/              # TypeScript types
│   ├── adapter/            # Agent adapters
│   │   ├── agent-adapter.ts        # Common interface
│   │   ├── code-search-factory.ts  # Code-search wrapper
│   │   └── codex-cli-adapter.ts    # Codex CLI adapter
│   ├── loader/             # Dataset loading & validation
│   ├── runner/             # Evaluation orchestration
│   ├── scorer/             # Scoring components
│   │   ├── file-coverage.ts    # LLM-based file extraction
│   │   ├── keyword-coverage.ts # Keyword matching
│   │   └── llm-judge.ts        # Semantic scoring
│   ├── reporter/           # Report generation
│   └── utils/              # Configuration utilities
├── config/
│   ├── default.json        # Default configuration (code-search)
│   └── codex.json          # Codex CLI configuration
└── dataset/                # Evaluation datasets
```

## Programmatic Usage

```typescript
import {
  DatasetLoader,
  EvaluationRunner,
  loadConfig,
  JSONReporter,
  ResultStorage
} from '@isara-ctx/code-search-eval';
import { CodeSearchAgentFactory } from '@isara-ctx/code-search-eval/adapter/code-search-factory';

// Load dataset
const loader = new DatasetLoader();
const dataset = await loader.load('./dataset/test.json');

// Load config
const config = await loadConfig('./eval.config.json');

// Create agent factory
const agentFactory = new CodeSearchAgentFactory();

// Run evaluation
const runner = new EvaluationRunner(config, process.env.OPENAI_API_KEY, agentFactory);
const run = await runner.runDataset(dataset);

// Generate report
const reporter = new JSONReporter();
const content = reporter.generate(run);

// Save results
const storage = new ResultStorage('./results');
await storage.save(run.id, 'json', content);
```

## Contributing

This package is part of the `ctx-agent-poc` monorepo. Follow the monorepo's development practices.

## License

See root LICENSE file.
