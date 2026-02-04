/**
 * Codex CLI Adapter
 *
 * Adapter for OpenAI Codex CLI that spawns the codex process
 * and sanitizes its output for evaluation.
 */

import { spawn } from 'child_process';
import type { AgentAdapter, AgentResult, AgentFactory } from './agent-adapter.js';

/**
 * Sanitize Codex CLI output by extracting the answer after the "codex" marker
 * @param raw - Raw output from Codex CLI
 * @returns Sanitized answer text
 */
export function sanitizeCodexOutput(raw: string): string {
  const sections = raw.split('--------');

  // Find answer after "codex\n" marker
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].includes('codex\n')) {
      const lines = sections[i].split('\n');
      const codexIndex = lines.findIndex((l) => l.trim() === 'codex');
      if (codexIndex >= 0) {
        return lines.slice(codexIndex + 1).join('\n').trim();
      }
    }
  }

  // Fallback: return last section
  return sections[sections.length - 1].trim();
}

export class CodexCliAdapter implements AgentAdapter {
  constructor(private repoPath: string) {}

  async run(config: {
    query: string;
    maxPlanSize?: number;
    maxStepIterations?: number;
    signal: AbortSignal;
  }): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      // Create clean environment for Codex CLI
      // Remove OPENAI_BASE_URL so Codex uses real OpenAI API
      // (OPENAI_BASE_URL is needed for LLM judge but not for Codex)
      const { OPENAI_BASE_URL, ...cleanEnv } = process.env;

      const proc = spawn('codex', ['exec', config.query], {
        cwd: this.repoPath,
        env: { ...cleanEnv, RUST_LOG: 'error' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout handling via AbortSignal
      const abortHandler = () => {
        proc.kill('SIGTERM');
        // Escalate to SIGKILL after 5 seconds if process doesn't terminate
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      };
      config.signal.addEventListener('abort', abortHandler);

      proc.on('close', (code) => {
        config.signal.removeEventListener('abort', abortHandler);

        if (config.signal.aborted) {
          reject(new Error('Codex execution timed out'));
          return;
        }

        if (code === 0) {
          const sanitized = sanitizeCodexOutput(stdout);
          resolve({
            answer: sanitized,
            reason: '', // Decision: All output in answer field
          });
        } else {
          reject(new Error(`Codex exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        config.signal.removeEventListener('abort', abortHandler);
        reject(new Error(`Failed to spawn codex: ${err.message}`));
      });
    });
  }
}

export class CodexCliFactory implements AgentFactory {
  async create(config: { path: string; llmConfig?: any }): Promise<AgentAdapter> {
    return new CodexCliAdapter(config.path);
  }
}
