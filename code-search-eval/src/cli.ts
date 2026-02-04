#!/usr/bin/env node

import meow from 'meow';
import { DatasetLoader } from './loader/dataset-loader.js';
import { EvaluationRunner } from './runner/eval-runner.js';
import { JSONReporter } from './reporter/json-reporter.js';
import { MarkdownReporter } from './reporter/markdown-reporter.js';
import { ResultStorage } from './reporter/storage.js';
import { loadConfig, mergeConfigWithFlags } from './utils/config-loader.js';
import { CodeSearchAgentFactory } from './adapter/code-search-factory.js';
import { CodexCliFactory } from './adapter/codex-cli-adapter.js';
import { ClaudeCliFactory } from './adapter/claude-cli-adapter.js';
import type { AgentFactory } from './adapter/agent-adapter.js';
import type { AgentType } from './types/index.js';
import chalk from 'chalk';

const cli = meow(
  `
  ${chalk.bold('Code Search Agent Evaluation')}

  ${chalk.underline('Usage')}
    $ code-search-eval <dataset-path>

  ${chalk.underline('Options')}
    --config, -c            Config file path (default: ./eval.config.json)
    --output, -o            Output directory (default: ./results)
    --format, -f            Report formats: json,markdown (default: json,markdown)
    --agent-type, -a        Agent type: code-search, codex, claude (default: code-search)
    --timeout               Timeout per question in milliseconds (default: 120000)
    --max-step-iterations   Max tool call iterations per step (default: 5)
    --max-plan-size         Max number of steps in plan (default: 10)
    --verbose, -v           Verbose logging
    --help                  Show this help message

  ${chalk.underline('Examples')}
    $ code-search-eval dataset/chromadb-admin-eval.json
    $ code-search-eval dataset/test.json --output ./custom-results
    $ code-search-eval dataset/test.json --agent-type codex
    $ code-search-eval dataset/test.json --agent-type claude
    $ code-search-eval dataset/test.json --verbose
`,
  {
    importMeta: import.meta,
    flags: {
      config: {
        type: 'string',
        shortFlag: 'c',
      },
      output: {
        type: 'string',
        shortFlag: 'o',
        default: './results',
      },
      format: {
        type: 'string',
        shortFlag: 'f',
        default: 'json,markdown',
      },
      agentType: {
        type: 'string',
        shortFlag: 'a',
      },
      verbose: {
        type: 'boolean',
        shortFlag: 'v',
        default: false,
      },
      maxStepIterations: {
        type: 'number',
      },
      maxPlanSize: {
        type: 'number',
      },
      timeout: {
        type: 'number',
      },
    },
  }
);

async function main() {
  const datasetPath = cli.input[0];

  if (!datasetPath) {
    console.error(chalk.red('\n✗ Error: Dataset path is required\n'));
    cli.showHelp();
    process.exit(1);
  }

  try {
    // Load configuration
    const config = await loadConfig(cli.flags.config);
    const finalConfig = mergeConfigWithFlags(config, cli.flags);

    // Determine agent type (CLI flag overrides config)
    const agentType = (cli.flags.agentType || finalConfig.agent.type || 'code-search') as AgentType;

    // Validate agent type
    if (!['code-search', 'codex', 'claude'].includes(agentType)) {
      console.error(chalk.red(`\n✗ Error: Invalid agent type: ${agentType}`));
      console.error(chalk.gray('Valid types: code-search, codex, claude\n'));
      process.exit(1);
    }

    // Update config
    finalConfig.agent.type = agentType;

    if (cli.flags.verbose) {
      console.log(chalk.gray('Configuration loaded:'));
      console.log(chalk.gray(JSON.stringify(finalConfig, null, 2)));
      console.log();
    }

    // Create appropriate factory
    let agentFactory: AgentFactory;
    if (agentType === 'codex') {
      console.log(chalk.cyan('Using Codex CLI agent'));
      agentFactory = new CodexCliFactory();
    } else if (agentType === 'claude') {
      console.log(chalk.cyan('Using Claude CLI agent'));
      agentFactory = new ClaudeCliFactory();
    } else {
      console.log(chalk.cyan('Using code-search agent'));
      agentFactory = new CodeSearchAgentFactory();
    }

    // Check API key
    if (!finalConfig.agent.llm.apiKey) {
      console.error(
        chalk.red(
          '\n✗ Error: OpenAI API key not found. Set OPENAI_API_KEY environment variable.\n'
        )
      );
      process.exit(1);
    }

    // Load dataset
    console.log(chalk.gray(`Loading dataset: ${datasetPath}`));
    const loader = new DatasetLoader();
    const dataset = await loader.load(datasetPath);

    // Validate repository path
    if (cli.flags.verbose) {
      console.log(chalk.gray(`Validating repository path: ${dataset.repo_path}`));
    }
    await loader.validateRepoPath(dataset.repo_path);

    // Run evaluation
    const runner = new EvaluationRunner(finalConfig, finalConfig.agent.llm.apiKey, agentFactory);
    const run = await runner.runDataset(dataset, { verbose: cli.flags.verbose });

    // Generate reports
    console.log(chalk.bold('\n📝 Generating reports...'));

    const formats = cli.flags.format.split(',').map((f: string) => f.trim());
    const storage = new ResultStorage(finalConfig.reporter.outputDir);

    for (const format of formats) {
      if (format === 'json') {
        const jsonReporter = new JSONReporter();
        const content = jsonReporter.generate(run);
        const { runPath, latestPath } = await storage.saveAsLatest(
          run.id,
          'json',
          content
        );
        console.log(chalk.green(`✓ JSON report saved:`));
        console.log(chalk.gray(`  ${runPath}`));
        console.log(chalk.gray(`  ${latestPath}`));
      } else if (format === 'markdown' || format === 'md') {
        const mdReporter = new MarkdownReporter();
        const content = mdReporter.generate(run);
        const { runPath, latestPath } = await storage.saveAsLatest(run.id, 'md', content);
        console.log(chalk.green(`✓ Markdown report saved:`));
        console.log(chalk.gray(`  ${runPath}`));
        console.log(chalk.gray(`  ${latestPath}`));
      } else {
        console.warn(chalk.yellow(`⚠ Unknown format: ${format}`));
      }
    }

    // Exit with appropriate status code
    const passRate = run.metrics.passRate;
    const exitCode = passRate >= 0.7 ? 0 : 1;

    console.log(
      chalk.bold(
        `\n${exitCode === 0 ? chalk.green('✓') : chalk.red('✗')} Evaluation ${exitCode === 0 ? 'passed' : 'failed'} (${(passRate * 100).toFixed(0)}% pass rate)\n`
      )
    );

    process.exit(exitCode);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      if (cli.flags.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

main();
