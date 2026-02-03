# Code Search Eval Makefile

# Environment variables
OPENAI_BASE_URL ?= http://127.0.0.1:2141/v1
OPENAI_API_KEY ?= dummy

# Default configuration
DATASET ?= dataset/chromadb-admin-eval.json
MAX_STEP_ITERATIONS ?= 20
TIMEOUT ?= 300000


.PHONY: eval
eval: ## Run evaluation with verbose output
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm dev $(DATASET) --verbose --max-step-iterations $(MAX_STEP_ITERATIONS) --timeout $(TIMEOUT)

# Dataset management
.PHONY: list-datasets
list-datasets: ## List available evaluation datasets
	@echo "Available datasets:"
	@ls -1 dataset/*.json

.PHONY: validate-dataset
validate-dataset: ## Validate dataset format
	@echo "Validating $(DATASET)..."
	@cat $(DATASET) | jq empty && echo "✓ Valid JSON" || echo "✗ Invalid JSON"
