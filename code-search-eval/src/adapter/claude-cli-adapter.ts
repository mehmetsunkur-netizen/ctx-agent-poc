/**
 * Claude CLI Adapter
 *
 * Adapter for Claude CLI (Claude Code) that spawns the claude process
 * and parses its output for evaluation.
 */

import { spawn } from 'child_process';
import type { AgentAdapter, AgentResult, AgentFactory } from './agent-adapter.js';

export interface ClaudeCliConfig {
  repoPath: string;
  model?: string;
  timeout?: number;
}

/**
 * Extract file references from Claude CLI output for better scoring
 * @param output - Claude CLI output text
 * @returns Array of file references found in output
 */
export function extractFileReferences(output: string): string[] {
  // Pattern matches: src/file.ts:10 or src/file.ts:10-20
  const fileRefPattern = /(?:^|\s)([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+(?::\d+(?:-\d+)?)?)/g;
  const matches = output.match(fileRefPattern) || [];

  // Deduplicate and filter out false positives
  const fileRefs = [...new Set(matches)]
    .map((ref) => ref.trim())
    .filter((ref) => {
      // Filter out URLs, examples, and non-paths
      return (
        !ref.startsWith('http') &&
        !ref.includes('example.') &&
        ref.includes('/') // Must be a path
      );
    });

  return fileRefs;
}

export class ClaudeCliAdapter implements AgentAdapter {
  constructor(private config: ClaudeCliConfig) {}

  async run(runConfig: {
    query: string;
    maxPlanSize?: number;
    maxStepIterations?: number;
    signal: AbortSignal;
  }): Promise<AgentResult> {
    const { query, signal } = runConfig;

    return new Promise((resolve, reject) => {
      // Build command args
      const args = [
        '--print',
        '--no-session-persistence',
        '--permission-mode',
        'dontAsk',
      ];

      // Model selection (optional)
      if (this.config.model) {
        args.push('--model', this.config.model);
      }

      // Query must be last
      // Note: No need to escape special characters - spawn() handles this
      // when shell:false (default). The query is passed as a direct argument.
      args.push(query);

      // Debug logging
      if (process.env.DEBUG) {
        console.error('[ClaudeCliAdapter] Spawning:', {
          args,
          cwd: this.config.repoPath,
          env: {
            ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
            ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN ? '***' : undefined,
          },
        });
      }

      // Spawn Claude CLI process
      // Use full path to avoid hook interception
      const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
      const proc = spawn(claudePath, args, {
        // shell: false is the default - don't change this!
        // This ensures special characters are handled safely
        cwd: this.config.repoPath,
        env: {
          ...process.env,
          // Disable hooks to prevent recursive Claude Code invocation
          CLAUDE_CODE_HOOKS_ENABLED: 'false',
          // Keep existing environment (already authenticated)
        },
        stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout: pipe, stderr: pipe
      });

      let stdout = '';
      let stderr = '';
      let processExited = false;

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (process.env.DEBUG) {
          console.error('[ClaudeCliAdapter] stdout chunk:', data.toString().slice(0, 100));
        }
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (process.env.DEBUG) {
          console.error('[ClaudeCliAdapter] stderr chunk:', data.toString());
        }
      });

      // Timeout handling via AbortSignal
      const abortHandler = () => {
        if (proc.pid && !processExited) {
          proc.kill('SIGTERM');
          // Escalate to SIGKILL after 5 seconds if process doesn't terminate
          setTimeout(() => {
            if (!processExited) {
              proc.kill('SIGKILL');
            }
          }, 5000);
        }
      };
      signal.addEventListener('abort', abortHandler);

      proc.on('close', (code) => {
        processExited = true;
        signal.removeEventListener('abort', abortHandler);

        if (process.env.DEBUG) {
          console.error('[ClaudeCliAdapter] Process closed:', {
            code,
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
            aborted: signal.aborted,
          });
        }

        if (signal.aborted) {
          reject(new Error('Claude CLI execution aborted (timeout)'));
          return;
        }

        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          return;
        }

        // Parse output
        const output = stdout.trim();

        if (!output) {
          reject(new Error('Claude CLI produced empty output'));
          return;
        }

        // Extract file references for better scoring
        const fileRefs = extractFileReferences(output);
        const reason =
          fileRefs.length > 0 ? `Files referenced:\n${fileRefs.join('\n')}` : '';

        resolve({
          answer: output,
          reason: reason,
        });
      });

      proc.on('error', (err) => {
        processExited = true;
        signal.removeEventListener('abort', abortHandler);
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
      });
    });
  }
}

export class ClaudeCliFactory implements AgentFactory {
  async create(config: {
    path: string;
    llmConfig?: {
      model?: string;
    };
    maxPlanSize?: number;
    maxStepIterations?: number;
  }): Promise<AgentAdapter> {
    return new ClaudeCliAdapter({
      repoPath: config.path,
      model: config.llmConfig?.model,
    });
  }

  cleanup(): void {
    // No persistent resources to clean up
  }
}
