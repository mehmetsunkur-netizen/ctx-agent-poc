.PHONY: help install build run clean test

# Configuration
QUERY ?= "development process engineers should follow at your company?"
MODEL ?= gpt-5.2-2025-12-11
MAX_PLAN_SIZE ?= 10
VERBOSE ?=

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
	@echo "  make clean            Clean build artifacts"
	@echo ""
	@echo "Examples:"
	@echo "  make run QUERY='Explain photosynthesis' MODEL=gpt-4"
	@echo "  make run QUERY='Capital of France' VERBOSE=--verbose"

install:
	pnpm install

build:
	pnpm build

run:
	OPENAI_BASE_URL=$(OPENAI_BASE_URL) OPENAI_API_KEY=$(OPENAI_API_KEY) \
	SEARCH_BACKEND=$(SEARCH_BACKEND) SEARCH_API_URL=$(SEARCH_API_URL) SEARCH_TIMEOUT_MS=$(SEARCH_TIMEOUT_MS) \
	CHROMA_HOST=$(CHROMA_HOST) CHROMA_PORT=$(CHROMA_PORT) \
	pnpm cli:dev $(QUERY) --model $(MODEL) --max-plan-size $(MAX_PLAN_SIZE) $(VERBOSE)

clean:
	pnpm clean
	rm -rf node_modules
