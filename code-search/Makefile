# Code Search Makefile

# Environment variables
OPENAI_BASE_URL ?= http://127.0.0.1:2141/v1
OPENAI_API_KEY ?= dummy

# Default configuration
MODEL ?= gpt-5.2-2025-12-11
QUERY ?= "How the chromadb connection is configured"
SEARCH_PATH ?= ../chromadb-admin

# Helper function to resolve paths to absolute
# Usage: $(call abs_path,$(SEARCH_PATH))
abs_path = $(shell cd "$(1)" 2>/dev/null && pwd || echo "$(1)")

.PHONY: search
search: ## Run code search with default query
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm cli:dev -m $(MODEL) "$(QUERY)" --path $(call abs_path,$(SEARCH_PATH))


# Example queries
.PHONY: example-auth
example-auth: ## Example: Search for authentication implementation
	$(MAKE) search QUERY="How is authentication implemented?" SEARCH_PATH=../../../../../../chromadb-admin

.PHONY: example-config
example-config: ## Example: Search for ChromaDB configuration
	$(MAKE) search QUERY="How the chromadb connection is configured" SEARCH_PATH=../../../../../../chromadb-admin

