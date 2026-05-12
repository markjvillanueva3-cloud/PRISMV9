/**
 * CodexClientEngine — Subprocess wrapper around the OpenAI `codex` CLI.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
 *
 * The codex CLI runs the user's authenticated ChatGPT subscription end-to-end
 * (login persisted in `~/.codex/`); we shell out via `codex exec` and capture
 * the trailing answer + token count from stderr. Default model: `gpt-5.5` at
 * reasoning effort `xhigh`. Both can be overridden per-call via `-c` overrides.
 *
 * No streaming in v1 — fits the existing OllamaClientEngine pattern.
 *
 * @module engines/CodexClientEngine
 */

import { spawn } from "node:child_process";

export interface CodexExecOptions {
  prompt: string;
  model?: string;                 // default: gpt-5.5 (Codex CLI's own default)
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";  // default xhigh
  workdir?: string;               // -C arg; default cwd
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  timeoutMs?: number;             // default 120s
  skipGitCheck?: boolean;         // default true (safer when called from anywhere)
}

export interface CodexResult {
  ok: boolean;
  answer: string;                 // final assistant answer (post-reasoning)
  tokens: number | null;          // null if parser couldn't extract
  model: string;                  // model that actually ran (echoed by CLI)
  latencyMs: number;
  error: string | null;
  rawStderrTail: string;          // last ~2000 chars of stderr for debugging
}

const CODEX_BIN = process.env.PRISM_CODEX_BIN ?? "codex";
const DEFAULT_MODEL = process.env.PRISM_CODEX_MODEL ?? "gpt-5.5";
const DEFAULT_EFFORT = (process.env.PRISM_CODEX_EFFORT ?? "xhigh") as CodexExecOptions["reasoningEffort"];
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_CODEX_TIMEOUT_MS ?? 120_000);
const DEFAULT_SANDBOX = (process.env.PRISM_CODEX_SANDBOX ?? "read-only") as CodexExecOptions["sandbox"];

export class CodexClientEngine {
  async exec(options: CodexExecOptions): Promise<CodexResult> {
    this.validate(options);
    const start = Date.now();
    const args = this.buildArgs(options);

    return new Promise<CodexResult>((resolve) => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      const settle = (r: CodexResult) => {
        if (settled) return;
        settled = true;
        resolve(r);
      };

      let child;
      try {
        // On Windows, .cmd/.bat shims (codex.cmd is one) cannot be launched
        // by CreateProcess directly — Node returns EINVAL. shell:true routes
        // through cmd.exe so the shim resolves, while POSIX systems keep the
        // direct spawn for performance.
        const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(CODEX_BIN);
        child = spawn(CODEX_BIN, args, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          cwd: options.workdir ?? process.cwd(),
          shell: useShell,
        });
      } catch (e) {
        return settle(this.fail(start, `spawn failed: ${(e as Error).message}`, ""));
      }

      const timer = setTimeout(() => {
        try { child.kill(); } catch { /* ignore */ }
        settle(this.fail(start, "timeout", stderr.slice(-2000)));
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (c) => { stdout += c; });
      child.stderr.on("data", (c) => { stderr += c; });

      child.on("error", (e) => {
        clearTimeout(timer);
        settle(this.fail(start, `process error: ${e.message}`, stderr.slice(-2000)));
      });

      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          return settle(this.fail(start, `exit ${code}`, stderr.slice(-2000)));
        }
        const parsed = this.parseOutput(stderr, stdout);
        settle({
          ok: true,
          answer: parsed.answer,
          tokens: parsed.tokens,
          model: parsed.model,
          latencyMs: Date.now() - start,
          error: null,
          rawStderrTail: stderr.slice(-2000),
        });
      });

      try {
        child.stdin.write(options.prompt);
        child.stdin.end();
      } catch (e) {
        clearTimeout(timer);
        settle(this.fail(start, `stdin write failed: ${(e as Error).message}`, stderr.slice(-2000)));
      }
    });
  }

  /**
   * Codex CLI prints session metadata + reasoning chain to stderr and the
   * final assistant answer immediately before the `tokens used` summary line.
   * The terminal layout is:
   *
   *   <session header / reasoning chain on stderr>
   *   codex
   *   <final answer body, possibly multi-line>
   *   tokens used
   *   <number>
   *
   * We extract the final answer by finding the last `codex\n...\ntokens used\n<n>` block in stderr.
   */
  parseOutput(stderr: string, _stdout: string): { answer: string; tokens: number | null; model: string } {
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
    const cleaned = stripAnsi(stderr);

    // Model line is `model: <name>` near the top
    const modelMatch = cleaned.match(/\nmodel:\s*([^\n]+)/);
    const model = modelMatch ? modelMatch[1].trim() : DEFAULT_MODEL;

    // Token count is the line after `tokens used`
    const tokMatch = cleaned.match(/tokens used\s*\n\s*([\d,]+)/);
    const tokens = tokMatch ? Number(tokMatch[1].replace(/,/g, "")) : null;

    // Final answer — between the LAST `\ncodex\n` and `\ntokens used\n` markers.
    let answer = "";
    const tokIdx = cleaned.lastIndexOf("tokens used");
    const codexIdx = cleaned.lastIndexOf("\ncodex\n", tokIdx >= 0 ? tokIdx : undefined);
    if (codexIdx >= 0) {
      const start = codexIdx + "\ncodex\n".length;
      const end = tokIdx >= 0 ? tokIdx : cleaned.length;
      answer = cleaned.slice(start, end).trim();
    } else {
      // fallback — entire stderr if we can't find markers
      answer = cleaned.trim();
    }
    return { answer, tokens, model };
  }

  // ---- internals ----

  private buildArgs(opts: CodexExecOptions): string[] {
    const args: string[] = ["exec"];
    if (opts.skipGitCheck !== false) args.push("--skip-git-repo-check");
    // --ignore-user-config: bypass $CODEX_HOME/config.toml so plugin-injected
    // url-based MCP servers don't break codex with "url is not supported for
    // stdio" errors. Auth still loads from CODEX_HOME. We pass model and
    // reasoning effort explicitly via -m / -c below, so config defaults are
    // not needed.
    args.push("--ignore-user-config");
    args.push("--sandbox", opts.sandbox ?? DEFAULT_SANDBOX ?? "read-only");
    if (opts.model) {
      args.push("-m", opts.model);
    } else {
      args.push("-m", DEFAULT_MODEL);
    }
    args.push("-c", `model_reasoning_effort="${opts.reasoningEffort ?? DEFAULT_EFFORT ?? "xhigh"}"`);
    return args;
  }

  private fail(start: number, error: string, rawStderrTail: string): CodexResult {
    return {
      ok: false,
      answer: "",
      tokens: null,
      model: DEFAULT_MODEL,
      latencyMs: Date.now() - start,
      error,
      rawStderrTail,
    };
  }

  private validate(opts: CodexExecOptions): void {
    if (!opts || typeof opts !== "object") throw new Error("CodexExecOptions required");
    if (typeof opts.prompt !== "string" || opts.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (opts.timeoutMs !== undefined) {
      if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
        throw new Error("timeoutMs must be a positive number");
      }
    }
    const validEfforts = ["low", "medium", "high", "xhigh"];
    if (opts.reasoningEffort !== undefined && !validEfforts.includes(opts.reasoningEffort)) {
      throw new Error(`reasoningEffort must be one of ${validEfforts.join("|")}`);
    }
    const validSandboxes = ["read-only", "workspace-write", "danger-full-access"];
    if (opts.sandbox !== undefined && !validSandboxes.includes(opts.sandbox)) {
      throw new Error(`sandbox must be one of ${validSandboxes.join("|")}`);
    }
  }
}

export const codexClientEngine = new CodexClientEngine();
