.PHONY: help install build run clean test

# Configuration
QUERY ?= "What is quantum computing?"
MODEL ?= gpt-4o-mini
MAX_PLAN_SIZE ?= 10
VERBOSE ?=

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
	pnpm cli:dev $(QUERY) --model $(MODEL) --max-plan-size $(MAX_PLAN_SIZE) $(VERBOSE)

clean:
	pnpm clean
	rm -rf node_modules
