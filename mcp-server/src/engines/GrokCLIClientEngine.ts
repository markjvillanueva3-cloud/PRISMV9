// WIRE-EXEMPT: internal LLM CLI client consumed by MultiModelConsensusEngine (octopus); not a user-facing dispatcher action.
/**
 * GrokCLIClientEngine — subprocess wrapper around xAI's Grok CLI.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS1 / OCTOPUS-CONSENSUS / GROK-CLI.
 *
 * Companion to {@link GrokClientEngine} (HTTP, needs `XAI_API_KEY`). THIS
 * engine drives the *CLI* — xAI's "Grok Build" (released 2026-05) or the
 * API-compatible community `grok` CLI (npm `grok-dev`). The CLI authenticates
 * via the user's Grok account (login persisted by `grok` itself), so it gives
 * the octopus consensus pipeline a Grok voice with NO API key in the
 * environment.
 *
 * ── Why this engine boxes the CLI in ───────────────────────────────────────
 * Grok Build / grok-cli are *agentic coding CLIs* — left alone they write
 * files and run shell actions. We only want a one-shot reasoning answer (a
 * consensus / review voice), so this engine:
 *   - runs the CLI in an isolated temporary working directory, so any stray
 *     file write the agent attempts lands in temp, never the caller's repo;
 *   - delivers the prompt ONLY on stdin — never as a process argument. A
 *     PRISM-context-injected prompt is far larger than the Windows ~32 KB
 *     argv limit, and an LLM-authored prompt placed in argv under `shell:true`
 *     would be a shell-injection vector. stdin sidesteps both;
 *   - closes stdin immediately so the agentic CLI cannot block on an
 *     interactive turn, and bounds every run with a hard timeout.
 *
 * ── Config surface (the CLI flag set is early-beta — keep it env-driven) ─────
 *   PRISM_GROK_CLI_BIN          binary name              (default "grok")
 *   PRISM_GROK_CLI_ARGS         headless flags, space-sep (default: none)
 *   PRISM_GROK_CLI_TIMEOUT_MS   per-call timeout ms      (default 120000)
 *   PRISM_GROK_CLI_MODEL        --model passthrough      (default unset)
 *
 * `PRISM_GROK_CLI_ARGS` carries whatever non-interactive / headless flag the
 * installed CLI version needs (e.g. `-p`); the prompt itself always rides
 * stdin. Only static, caller-controlled flags ever reach argv.
 *
 * If `XAI_API_KEY` is set, prefer {@link GrokClientEngine}: the HTTP path is
 * deterministic and has no agentic side-effect surface at all.
 *
 * @module engines/GrokCLIClientEngine
 */

import { spawn as nodeSpawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Subset of `child_process.spawn` this engine depends on — injectable for tests. */
export type SpawnLike = typeof nodeSpawn;

export interface GrokCLIRunOptions {
  prompt: string;
  /** Model passthrough — emitted as `--model <value>`. Default: PRISM_GROK_CLI_MODEL (unset → CLI default). */
  model?: string;
  /** Working directory for the spawned CLI. Default: the OS temp dir (agentic-write containment). */
  workdir?: string;
  /** Per-call timeout. Default: PRISM_GROK_CLI_TIMEOUT_MS or 120_000. */
  timeoutMs?: number;
  /** Static headless flags — overrides PRISM_GROK_CLI_ARGS for this call. The prompt is never placed here. */
  extraArgs?: readonly string[];
}

export interface GrokCLIResult {
  ok: boolean;
  /** Final answer text (stdout, trimmed). Empty on failure. */
  answer: string;
  /** Model label that ran (the requested/default model, or "grok-cli"). */
  model: string;
  latencyMs: number;
  error: string | null;
  /** Last ~2000 chars of stderr — for debugging a misconfigured invocation. */
  rawStderrTail: string;
}

const GROK_CLI_BIN = process.env.PRISM_GROK_CLI_BIN ?? "grok";
const DEFAULT_MODEL = process.env.PRISM_GROK_CLI_MODEL ?? "";
const STDERR_TAIL_CHARS = 2000;
const FALLBACK_TIMEOUT_MS = 120_000;

/**
 * Per-call timeout default. A non-numeric PRISM_GROK_CLI_TIMEOUT_MS would
 * yield NaN, and `setTimeout(fn, NaN)` is coerced to 0 by Node — so every
 * call would "time out" on the next tick, silently. Sanitize at module load:
 * a bad env var falls back to 120 s instead of breaking every Grok voice.
 */
const RAW_TIMEOUT_MS = Number(process.env.PRISM_GROK_CLI_TIMEOUT_MS ?? FALLBACK_TIMEOUT_MS);
const DEFAULT_TIMEOUT_MS =
  Number.isFinite(RAW_TIMEOUT_MS) && RAW_TIMEOUT_MS > 0 ? RAW_TIMEOUT_MS : FALLBACK_TIMEOUT_MS;

/** Static headless flags from PRISM_GROK_CLI_ARGS (space-separated). Default: none. */
function defaultExtraArgs(): string[] {
  const raw = process.env.PRISM_GROK_CLI_ARGS;
  if (raw === undefined || raw.trim().length === 0) return [];
  return raw.split(/\s+/).filter((s) => s.length > 0);
}

/**
 * First matching executable for `bin` on PATH, or null. Synchronous, no
 * subprocess. An explicit path (containing a separator) is checked directly;
 * a bare name is searched across PATH with the Windows shim extensions.
 */
function resolveBinOnPath(bin: string): string | null {
  try {
    if (/[\\/]/.test(bin)) {
      return existsSync(bin) && statSync(bin).isFile() ? bin : null;
    }
  } catch {
    return null;
  }
  const dirs = (process.env.PATH ?? process.env.Path ?? "").split(path.delimiter).filter(Boolean);
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat", ".ps1"] : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      try {
        const full = path.join(dir, bin + ext);
        if (existsSync(full) && statSync(full).isFile()) return full;
      } catch {
        // unreadable PATH dir — skip
      }
    }
  }
  return null;
}

export class GrokCLIClientEngine {
  /** @param spawnImpl injectable spawn — defaults to node:child_process.spawn (hermetic tests pass a fake). */
  constructor(private readonly spawnImpl: SpawnLike = nodeSpawn) {}

  /** Memoized PATH-resolution result for the Grok CLI binary. */
  private cachedAvailability: boolean | null = null;

  /**
   * True when the Grok CLI binary (PRISM_GROK_CLI_BIN, default "grok") resolves
   * on PATH. Lets a caller (e.g. MultiModelConsensusEngine) gate the Grok voice
   * on real CLI availability rather than on XAI_API_KEY alone.
   *
   * Memoized for the process lifetime: a sync PATH walk on every consensus
   * call would be wasteful, and a CLI install mid-process is rare — a server
   * restart re-checks. The SessionStart octopus probe is the surface that
   * picks up a fresh install immediately.
   */
  isAvailable(): boolean {
    if (this.cachedAvailability === null) {
      this.cachedAvailability = resolveBinOnPath(GROK_CLI_BIN) !== null;
    }
    return this.cachedAvailability;
  }

  /**
   * Run a single headless prompt through the Grok CLI and return the answer.
   * Never throws on a CLI failure — returns `{ok:false, error}`. Throws only
   * on caller misuse (invalid options), per the consensus-engine voice
   * contract (a failed voice must degrade, not crash the fan-out).
   */
  async run(options: GrokCLIRunOptions): Promise<GrokCLIResult> {
    this.validate(options);
    const start = Date.now();
    const model = options.model ?? DEFAULT_MODEL;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // argv carries ONLY static, caller-controlled flags — never the prompt.
    const args: string[] = [...(options.extraArgs ?? defaultExtraArgs())];
    if (model.length > 0) args.push("--model", model);

    // Isolated temp cwd contains any agentic file-write the CLI attempts.
    const workdir = options.workdir ?? os.tmpdir();

    return new Promise<GrokCLIResult>((resolve) => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      const settle = (r: GrokCLIResult) => {
        if (settled) return;
        settled = true;
        resolve(r);
      };

      let child;
      try {
        // A `.cmd`/`.bat` shim (npm global installs create one) or a bare
        // PATH name cannot be launched by CreateProcess directly — route it
        // through cmd.exe. A concrete `.exe` path is spawned DIRECTLY: no
        // shell means no argv-quoting hazard and CreateProcess handles spaces
        // in paths natively. Safe under shell either way — every argv entry
        // is a static caller-controlled flag, never the prompt.
        const useShell = process.platform === "win32" && !/\.exe$/i.test(GROK_CLI_BIN);
        child = this.spawnImpl(GROK_CLI_BIN, args, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          cwd: workdir,
          shell: useShell,
        });
      } catch (e) {
        return settle(this.fail(start, model, `spawn failed: ${(e as Error).message}`, ""));
      }

      // A degraded spawn can return a child with null stdio pipes without
      // throwing — guard before touching them.
      if (!child || !child.stdout || !child.stderr || !child.stdin) {
        try { child?.kill(); } catch { /* ignore */ }
        return settle(this.fail(start, model, "spawn produced no stdio pipes", ""));
      }

      const timer = setTimeout(() => {
        try { child.kill(); } catch { /* ignore */ }
        settle(this.fail(start, model, "timeout", stderr.slice(-STDERR_TAIL_CHARS)));
      }, timeoutMs);

      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (c) => { stdout += c; });
      child.stderr.on("data", (c) => { stderr += c; });

      // An agentic CLI that consumes its input and exits early closes stdin
      // under us → an async EPIPE on child.stdin. Swallow it: the run's real
      // outcome is always settled by 'close' / 'error' / the timeout. Without
      // this listener an unhandled stream 'error' crashes the whole process —
      // violating the voice contract (a failed voice degrades the consensus
      // fan-out, never crashes it).
      child.stdin.on("error", () => { /* benign — settled elsewhere */ });

      child.on("error", (e) => {
        clearTimeout(timer);
        settle(this.fail(start, model, `process error: ${e.message}`, stderr.slice(-STDERR_TAIL_CHARS)));
      });

      // 'close' (not 'exit') — it fires AFTER all stdio streams have flushed,
      // so `stdout` is guaranteed complete. Listening on 'exit' could read a
      // still-buffered stdout and return a truncated/empty answer for a large
      // multi-KB review response.
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          return settle(this.fail(start, model, `exit ${code}`, stderr.slice(-STDERR_TAIL_CHARS)));
        }
        const answer = stdout.trim();
        if (answer.length === 0) {
          return settle(this.fail(start, model, "empty stdout from grok CLI", stderr.slice(-STDERR_TAIL_CHARS)));
        }
        settle({
          ok: true,
          answer,
          model: model.length > 0 ? model : "grok-cli",
          latencyMs: Date.now() - start,
          error: null,
          rawStderrTail: stderr.slice(-STDERR_TAIL_CHARS),
        });
      });

      // Deliver the prompt on stdin, then close it unconditionally so the
      // agentic CLI cannot block waiting for an interactive turn.
      try {
        child.stdin.write(options.prompt);
        child.stdin.end();
      } catch (e) {
        clearTimeout(timer);
        try { child.kill(); } catch { /* ignore */ }
        settle(this.fail(start, model, `stdin write failed: ${(e as Error).message}`, stderr.slice(-STDERR_TAIL_CHARS)));
      }
    });
  }

  // ---- internals ----

  private fail(start: number, model: string, error: string, rawStderrTail: string): GrokCLIResult {
    return {
      ok: false,
      answer: "",
      model: model.length > 0 ? model : "grok-cli",
      latencyMs: Date.now() - start,
      error,
      rawStderrTail,
    };
  }

  private validate(opts: GrokCLIRunOptions): void {
    if (!opts || typeof opts !== "object") throw new Error("GrokCLIRunOptions required");
    if (typeof opts.prompt !== "string" || opts.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (opts.timeoutMs !== undefined) {
      if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
        throw new Error("timeoutMs must be a positive number");
      }
    }
    if (opts.extraArgs !== undefined && !Array.isArray(opts.extraArgs)) {
      throw new Error("extraArgs must be an array of strings");
    }
  }
}

export const grokCLIClientEngine = new GrokCLIClientEngine();
