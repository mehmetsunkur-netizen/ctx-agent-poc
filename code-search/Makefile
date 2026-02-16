# Code Search Makefile

# Environment variables
OPENAI_BASE_URL ?= http://127.0.0.1:2141/v1
OPENAI_API_KEY ?= dummy

# Default configuration
MODEL ?= gpt-5.2-2025-12-11
QUERY ?= "How the chromadb connection is configured"
REPOSITORY_PATH ?= ../chromadb-admin
CHROMA_COLLECTION ?= repo-chromadb-admin

# Helper function to resolve paths to absolute
# Usage: $(call abs_path,$(REPOSITORY_PATH))
abs_path = $(shell cd "$(1)" 2>/dev/null && pwd || echo "$(1)")

.PHONY: index
index: ## Index a repository into ChromaDB collection
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm index $(call abs_path,$(REPOSITORY_PATH)) --collection $(CHROMA_COLLECTION)

.PHONY: search
search: ## Run code search with collection
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	pnpm cli:dev -m $(MODEL) "$(QUERY)" --collection $(CHROMA_COLLECTION) 


# Example: Index and search workflow
.PHONY: example-index
example-index: ## Example: Index chromadb-admin repository
	$(MAKE) index CHROMA_COLLECTION=repo-chromadb-admin REPOSITORY_PATH=../../../../../../chromadb-admin

# Example queries
.PHONY: example-auth
example-auth: ## Example: Search for authentication implementation
	$(MAKE) search QUERY="How is authentication implemented?" CHROMA_COLLECTION=repo-chromadb-admin

.PHONY: example-config
example-config: ## Example: Search for ChromaDB configuration
	$(MAKE) search QUERY="How the chromadb connection is configured" CHROMA_COLLECTION=repo-chromadb-admin

.PHONY: example-test
example-test: ## Example: Search for test files
	$(MAKE) search QUERY="How is authentication implemented?" CHROMA_COLLECTION=repo-chromadb-admin 