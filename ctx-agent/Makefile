.PHONY: help install build run clean test

# Configuration
QUERY ?= "development process engineers should follow at your company?"
MODEL ?= gpt-5.2-2025-12-11
MAX_PLAN_SIZE ?= 10
SOURCE ?=
VERBOSE ?=
DEBUG_FILE ?=

OPENAI_BASE_URL ?= http://host.docker.internal:2141/v1
OPENAI_API_KEY ?= dummy
CHROMA_HOST ?= chroma
CHROMA_PORT ?= 8000
SEARCH_BACKEND ?= http
SEARCH_API_URL ?= http://127.0.0.1:3059
SEARCH_TIMEOUT_MS ?= 30000  # Optional, defaults to 30000

help:
	@echo "CTX-Agent Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make install          Install dependencies"
	@echo "  make build            Build all packages"
	@echo "  make run              Run agent with default query"
	@echo "  make run QUERY='...'  Run agent with custom query"
	@echo "  make list-sources     List available data sources"
	@echo "  make clean            Clean build artifacts"
	@echo ""
	@echo "Examples:"
	@echo "  make run QUERY='What is our vacation policy?'"
	@echo "  make run QUERY='What tools do engineers use?' SOURCE=slack"
	@echo "  make run QUERY='What are our processes?' SOURCE=org-data VERBOSE=--verbose"
	@echo "  make run QUERY='Debug query' DEBUG_FILE=debug.json"
	@echo "  make list-sources"

install:
	pnpm install

build:
	pnpm build

run:
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	SEARCH_BACKEND=$(SEARCH_BACKEND) SEARCH_API_URL=$(SEARCH_API_URL) SEARCH_TIMEOUT_MS=$(SEARCH_TIMEOUT_MS) \
	CHROMA_HOST=$(CHROMA_HOST) CHROMA_PORT=$(CHROMA_PORT) \
	pnpm cli:dev "$(QUERY)" --model $(MODEL) --max-plan-size $(MAX_PLAN_SIZE) $(if $(SOURCE),--source $(SOURCE)) $(if $(DEBUG_FILE),--debug-file $(DEBUG_FILE)) $(VERBOSE)

list-sources:
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	SEARCH_BACKEND=$(SEARCH_BACKEND) SEARCH_API_URL=$(SEARCH_API_URL) \
	CHROMA_HOST=$(CHROMA_HOST) CHROMA_PORT=$(CHROMA_PORT) \
	pnpm cli:dev --list-sources

clean:
	pnpm clean
	rm -rf node_modules
