# Code Search Eval Makefile

# Environment variables
OPENAI_BASE_URL ?= http://127.0.0.1:2141/v1
OPENAI_API_KEY ?= dumo

ANTHROPIC_BASE_URL ?= http://127.0.0.1:2141
ANTHROPIC_AUTH_TOKEN ?= duma

# Default configuration
DATASET ?= dataset/chromadb-admin-eval.json
MAX_STEP_ITERATIONS ?= 20
TIMEOUT ?= 600000
AGENT_TYPE ?= code-search

# Help target
.PHONY: help
help: ## Show this help message
	@echo "Code Search Evaluation - Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make eval-code-search         # Run with code-search agent"
	@echo "  make eval-codex               # Run with Codex CLI"
	@echo "  make eval-claude              # Run with Claude CLI"
	@echo "  make eval-all-agents          # Run all agents sequentially"
	@echo "  make DATASET=dataset/test.json eval  # Use custom dataset"

.PHONY: eval
eval: ## Run evaluation with verbose output (default agent: code-search)
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm dev $(DATASET) --verbose --max-step-iterations $(MAX_STEP_ITERATIONS) --timeout $(TIMEOUT) --agent-type $(AGENT_TYPE)

# Agent-specific evaluation targets
.PHONY: eval-code-search
eval-code-search: ## Run evaluation with code-search agent
	@echo "Running evaluation with code-search agent..."
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm dev $(DATASET) --verbose --max-step-iterations $(MAX_STEP_ITERATIONS) --timeout $(TIMEOUT) --agent-type code-search

.PHONY: eval-codex
eval-codex: ## Run evaluation with Codex CLI
	@echo "Running evaluation with Codex CLI..."
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm dev $(DATASET) --verbose --timeout $(TIMEOUT) --agent-type codex

.PHONY: eval-claude
eval-claude: ## Run evaluation with Claude CLI
	@echo "Running evaluation with Claude CLI..."
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	ANTHROPIC_BASE_URL=$(ANTHROPIC_BASE_URL) ANTHROPIC_AUTH_TOKEN=$(ANTHROPIC_AUTH_TOKEN) \
	pnpm dev $(DATASET) --verbose --timeout $(TIMEOUT) --config config/claude.json

.PHONY: eval-both
eval-both: ## Run evaluation with both agents sequentially (deprecated: use eval-all-agents)
	@echo "========================================="
	@echo "Running evaluation with code-search agent"
	@echo "========================================="
	@$(MAKE) eval-code-search
	@echo ""
	@echo "========================================="
	@echo "Running evaluation with Codex CLI"
	@echo "========================================="
	@$(MAKE) eval-codex
	@echo ""
	@echo "✓ Both evaluations complete. Check ./results/ for outputs."

.PHONY: eval-all-agents
eval-all-agents: ## Run evaluation with all agents sequentially
	@echo "========================================="
	@echo "Running evaluation with code-search agent"
	@echo "========================================="
	@$(MAKE) eval-code-search
	@echo ""
	@echo "========================================="
	@echo "Running evaluation with Codex CLI"
	@echo "========================================="
	@$(MAKE) eval-codex
	@echo ""
	@echo "========================================="
	@echo "Running evaluation with Claude CLI"
	@echo "========================================="
	@$(MAKE) eval-claude
	@echo ""
	@echo "✓ All evaluations complete. Check ./results/ for outputs."

# Quick examples with specific datasets
.PHONY: example-chromadb
example-chromadb: ## Example: Evaluate ChromaDB dataset with code-search
	@$(MAKE) eval-code-search DATASET=dataset/chromadb-admin-eval.json

.PHONY: example-chromadb-codex
example-chromadb-codex: ## Example: Evaluate ChromaDB dataset with Codex
	@$(MAKE) eval-codex DATASET=dataset/chromadb-admin-eval.json

.PHONY: example-quick-test
example-quick-test: ## Example: Quick test with minimal dataset
	@echo "Running quick test (adjust DATASET if needed)..."
	@$(MAKE) eval-code-search DATASET=dataset/chromadb-admin-eval.json TIMEOUT=60000

# Configuration examples
.PHONY: eval-with-config
eval-with-config: ## Run evaluation with config file (CONFIG variable)
	@test -n "$(CONFIG)" || (echo "Error: CONFIG variable required. Example: make eval-with-config CONFIG=config/codex.json" && exit 1)
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm dev $(DATASET) --verbose --config $(CONFIG)

.PHONY: example-codex-config
example-codex-config: ## Example: Run with codex.json config
	@$(MAKE) eval-with-config CONFIG=config/codex.json DATASET=dataset/chromadb-admin-eval.json

.PHONY: example-claude-config
example-claude-config: ## Example: Run with claude.json config
	@$(MAKE) eval-with-config CONFIG=config/claude.json DATASET=dataset/chromadb-admin-eval.json

.PHONY: example-default-config
example-default-config: ## Example: Run with default.json config
	@$(MAKE) eval-with-config CONFIG=config/default.json DATASET=dataset/chromadb-admin-eval.json

# Dataset management
.PHONY: list-datasets
list-datasets: ## List available evaluation datasets
	@echo "Available datasets:"
	@ls -1 dataset/*.json

.PHONY: validate-dataset
validate-dataset: ## Validate dataset format
	@echo "Validating $(DATASET)..."
	@cat $(DATASET) | jq empty && echo "✓ Valid JSON" || echo "✗ Invalid JSON"
