# Agentic Search Makefile

# Environment variables
OPENAI_BASE_URL ?= http://127.0.0.1:2141/v1
OPENAI_API_KEY ?= dummy

# Default configuration
QUERY_ID ?= 770
MODEL ?= gpt-5.2-2025-12-11
MAX_PLAN_SIZE ?= 10


.PHONY: run
run: ## Run with default query (770) and settings
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm cli:dev $(QUERY_ID) -m $(MODEL) --max-plan-size $(MAX_PLAN_SIZE) -v

# Example targets for specific queries
.PHONY: query-769
query-769: ## Run query 769
	$(MAKE) run QUERY_ID=769

