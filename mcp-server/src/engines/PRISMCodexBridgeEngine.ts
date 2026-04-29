/**
 * PRISMCodexBridgeEngine — wraps the Codex CLI (`codex exec`, `codex review`)
 * with PRISM safety-tier metadata so the orchestrate dispatcher can delegate
 * planning/review work to a second model family for independent error sampling.
 *
 * Two backends:
 *   - CLI (always-available): direct child_process.spawn against the codex
 *     binary. This is what the engine actually invokes — deterministic,
 *     testable, no terminal hijacking, no marketplace dependency.
 *   - Plugin (soft signal): if `openai/codex-plugin-cc` is installed in the
 *     Claude Code plugin cache, the engine reports `pluginAvailable=true` so
 *     the dispatcher can surface the slash-command UX (`/codex:rescue`) as a
 *     hint to the operator. The engine itself never depends on the plugin
 *     being present.
 *
 * Tier → {model, reasoningEffort} mapping is the contract that lets PRISM's
 * Ω-tier system pick a Codex configuration matching the work's safety class.
 * shop_floor → biggest model + maximum reasoning; sim → smallest + minimal.
 *
 * Output is the AtomicValue-style envelope used elsewhere in PRISM (status +
 * data + meta) so it composes cleanly with the consensus gate (P4-U01) and
 * the orchestrate dispatcher.
 *
 * Refs: INTEL-OLLAMA-OBSIDIAN-MS1 P1-U02. CLI surface validated against
 *       `codex exec --help` and `codex review --help` on this machine.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// -- Constants -------------------------------------------------------------

/** Tier names sourced from `state/shared/omega-thresholds.json`. */
export type SafetyTier = "shop_floor" | "production" | "proven_out" | "sim";

/** Reasoning effort levels accepted by codex CLI via `-c reasoning_effort=...` */
export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

interface TierMapping {
  model: string;
  reasoningEffort: ReasoningEffort;
}

/**
 * Tier → Codex config. shop_floor maps to gpt-5 with maximum reasoning so
 * cutting-data review gets the slowest, most-deliberate Codex config. Sim
 * maps to gpt-5-mini with minimal reasoning so exploratory queries don't
 * burn budget. Update model names here if the codex catalog changes — the
 * single source of truth for PRISM's Codex integration.
 */
const TIER_MAPPINGS: Readonly<Record<SafetyTier, TierMapping>> = Object.freeze({
  shop_floor: { model: "gpt-5", reasoningEffort: "high" },
  production: { model: "gpt-5", reasoningEffort: "medium" },
  proven_out: { model: "gpt-5-mini", reasoningEffort: "medium" },
  sim: { model: "gpt-5-mini", reasoningEffort: "low" },
});

const DEFAULT_TIMEOUT_MS = 120_000;
const PLUGIN_CACHE_PATHS = [
  "C:/Users/wompu/.claude/plugins/installed_plugins.json",
  // Generic fallback for cross-platform development
  process.env.HOME ? join(process.env.HOME, ".claude/plugins/installed_plugins.json") : "",
].filter(Boolean);
const CODEX_BINARY_CANDIDATES = [
  "C:/Users/wompu/AppData/Roaming/npm/codex.cmd",
  "C:/Users/wompu/AppData/Roaming/npm/codex.ps1",
  process.env.HOME ? join(process.env.HOME, ".local/bin/codex") : "",
  "/usr/local/bin/codex",
  "codex", // last-resort PATH probe
].filter(Boolean);

// -- Public types ----------------------------------------------------------

export interface DelegateOptions {
  prompt: string;
  tier: SafetyTier;
  /** Override the timeout window. Default 120s — Codex reasoning can be slow. */
  timeoutMs?: number;
  /** Optional extra `-c key=value` overrides forwarded to codex CLI. */
  configOverrides?: Record<string, string>;
}

export interface ReviewOptions {
  /** Custom review instructions. Falls back to a generic prompt if omitted. */
  prompt?: string;
  tier: SafetyTier;
  /** Pick exactly one diff source; if none, codex defaults to its own selection. */
  diffSource?:
    | { kind: "uncommitted" }
    | { kind: "base"; branch: string }
    | { kind: "commit"; sha: string };
  timeoutMs?: number;
  configOverrides?: Record<string, string>;
}

export interface BridgeResult {
  status: "ok" | "auth_required" | "cli_missing" | "timeout" | "error";
  data: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    durationMs: number;
  };
  meta: {
    backend: "cli";
    binary: string | null;
    model: string;
    reasoningEffort: ReasoningEffort;
    pluginAvailable: boolean;
    /** Hint for the operator if the plugin is installed in Claude Code. */
    pluginHint?: string;
  };
  reason?: string;
}

// -- Engine ----------------------------------------------------------------

export class PRISMCodexBridgeEngine {
  /** Tier → {model, reasoningEffort}. Pure lookup, used by tests + dispatcher. */
  static getTierMapping(tier: SafetyTier): TierMapping {
    return TIER_MAPPINGS[tier];
  }

  /** Resolve the codex binary on this machine, or null if none is reachable. */
  static resolveBinary(): string | null {
    for (const candidate of CODEX_BINARY_CANDIDATES) {
      if (candidate === "codex") continue; // handled by spawn PATH lookup
      if (existsSync(candidate)) return candidate;
    }
    // Last-resort: return the bare name and let spawn report ENOENT if missing
    return "codex";
  }

  /**
   * Read Claude Code's installed_plugins.json and report whether the
   * codex-plugin-cc plugin is registered. Soft signal only — this never
   * gates execution.
   */
  static isPluginInstalled(): boolean {
    for (const path of PLUGIN_CACHE_PATHS) {
      if (!existsSync(path)) continue;
      try {
        const raw = readFileSync(path, "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          const record = parsed as Record<string, unknown>;
          // Check for either openai/codex-plugin-cc or codex@openai-codex naming
          const keys = Object.keys(record);
          if (keys.some((k) => /codex-plugin-cc|codex@openai-codex|openai-codex/i.test(k))) {
            return true;
          }
          // Some Claude Code versions nest under "plugins" array
          const inner = record.plugins;
          if (Array.isArray(inner)) {
            return inner.some((p) => {
              if (!p || typeof p !== "object") return false;
              const r = p as Record<string, unknown>;
              const name = String(r.name ?? r.id ?? "");
              return /codex-plugin-cc|codex@openai-codex|openai-codex/i.test(name);
            });
          }
        }
      } catch {
        // Malformed plugin cache → treat as not-installed
      }
    }
    return false;
  }

  /** Delegate work to Codex via `codex exec`. */
  static async delegate(opts: DelegateOptions): Promise<BridgeResult> {
    const mapping = TIER_MAPPINGS[opts.tier];
    const args = ["exec"];
    args.push("-c", `model="${mapping.model}"`);
    args.push("-c", `reasoning_effort="${mapping.reasoningEffort}"`);
    if (opts.configOverrides) {
      for (const [key, value] of Object.entries(opts.configOverrides)) {
        args.push("-c", `${key}=${value}`);
      }
    }
    return PRISMCodexBridgeEngine.runCodex({
      args,
      stdin: opts.prompt,
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      mapping,
    });
  }

  /** Run Codex code-review via `codex review`. */
  static async review(opts: ReviewOptions): Promise<BridgeResult> {
    const mapping = TIER_MAPPINGS[opts.tier];
    const args = ["review"];
    args.push("-c", `model="${mapping.model}"`);
    args.push("-c", `reasoning_effort="${mapping.reasoningEffort}"`);
    if (opts.diffSource) {
      switch (opts.diffSource.kind) {
        case "uncommitted":
          args.push("--uncommitted");
          break;
        case "base":
          args.push("--base", opts.diffSource.branch);
          break;
        case "commit":
          args.push("--commit", opts.diffSource.sha);
          break;
      }
    }
    if (opts.configOverrides) {
      for (const [key, value] of Object.entries(opts.configOverrides)) {
        args.push("-c", `${key}=${value}`);
      }
    }
    const promptText = opts.prompt ?? "";
    return PRISMCodexBridgeEngine.runCodex({
      args,
      stdin: promptText,
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      mapping,
    });
  }

  // -- Internal --

  private static runCodex(args: {
    args: string[];
    stdin: string;
    timeoutMs: number;
    mapping: TierMapping;
  }): Promise<BridgeResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const binary = PRISMCodexBridgeEngine.resolveBinary();
      const pluginAvailable = PRISMCodexBridgeEngine.isPluginInstalled();
      const pluginHint = pluginAvailable
        ? "Plugin installed: /codex:rescue and /codex:review available in your live REPL too."
        : undefined;

      if (!binary) {
        resolve({
          status: "cli_missing",
          data: { stdout: "", stderr: "", exitCode: null, durationMs: Date.now() - start },
          meta: {
            backend: "cli",
            binary: null,
            model: args.mapping.model,
            reasoningEffort: args.mapping.reasoningEffort,
            pluginAvailable,
            pluginHint,
          },
          reason:
            "codex CLI not found. Install via `npm i -g @openai/codex` or check PATH. " +
            (pluginAvailable
              ? "Plugin is installed in Claude Code, but the engine still needs the CLI binary."
              : ""),
        });
        return;
      }

      // Always pipe the prompt via stdin (rather than argv). This keeps the
      // command line small and lets us safely use `shell: true` on Windows
      // for .cmd/.bat compatibility without worrying about shell injection
      // from the prompt content. The trailing "-" tells codex to read from
      // stdin when no inline prompt is provided.
      const finalArgs = [...args.args, "-"];
      const isShellTarget = /\.(?:cmd|bat|ps1)$/i.test(binary);

      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(binary, finalArgs, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          env: { ...process.env },
          shell: isShellTarget,
        });
      } catch (err) {
        resolve({
          status: "error",
          data: {
            stdout: "",
            stderr: err instanceof Error ? err.message : String(err),
            exitCode: null,
            durationMs: Date.now() - start,
          },
          meta: {
            backend: "cli",
            binary,
            model: args.mapping.model,
            reasoningEffort: args.mapping.reasoningEffort,
            pluginAvailable,
            pluginHint,
          },
          reason: "spawn failed",
        });
        return;
      }

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const killTimer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        // Hard kill after a 2-second grace period
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 2000);
      }, args.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      // Pipe the prompt body to stdin and close — codex reads until EOF.
      if (args.stdin.length > 0) child.stdin.write(args.stdin);
      child.stdin.end();

      child.on("error", (err) => {
        clearTimeout(killTimer);
        resolve({
          status: "error",
          data: {
            stdout,
            stderr: stderr + (err.message ? `\n${err.message}` : ""),
            exitCode: null,
            durationMs: Date.now() - start,
          },
          meta: {
            backend: "cli",
            binary,
            model: args.mapping.model,
            reasoningEffort: args.mapping.reasoningEffort,
            pluginAvailable,
            pluginHint,
          },
          reason: "spawn error",
        });
      });

      child.on("close", (exitCode) => {
        clearTimeout(killTimer);
        const durationMs = Date.now() - start;

        if (timedOut) {
          resolve({
            status: "timeout",
            data: { stdout, stderr, exitCode, durationMs },
            meta: {
              backend: "cli",
              binary,
              model: args.mapping.model,
              reasoningEffort: args.mapping.reasoningEffort,
              pluginAvailable,
              pluginHint,
            },
            reason: `codex CLI exceeded ${args.timeoutMs}ms`,
          });
          return;
        }

        // Detect auth expired by stderr signature
        const authExpired = /login required|not logged in|auth.*expired|please run.*codex login/i.test(
          stderr,
        );
        if (authExpired) {
          resolve({
            status: "auth_required",
            data: { stdout, stderr, exitCode, durationMs },
            meta: {
              backend: "cli",
              binary,
              model: args.mapping.model,
              reasoningEffort: args.mapping.reasoningEffort,
              pluginAvailable,
              pluginHint,
            },
            reason: "codex login required — run `codex login` and retry",
          });
          return;
        }

        if (exitCode === 0) {
          resolve({
            status: "ok",
            data: { stdout, stderr, exitCode, durationMs },
            meta: {
              backend: "cli",
              binary,
              model: args.mapping.model,
              reasoningEffort: args.mapping.reasoningEffort,
              pluginAvailable,
              pluginHint,
            },
          });
          return;
        }

        resolve({
          status: "error",
          data: { stdout, stderr, exitCode, durationMs },
          meta: {
            backend: "cli",
            binary,
            model: args.mapping.model,
            reasoningEffort: args.mapping.reasoningEffort,
            pluginAvailable,
            pluginHint,
          },
          reason: `codex CLI exited with code ${exitCode}`,
        });
      });
    });
  }
}
