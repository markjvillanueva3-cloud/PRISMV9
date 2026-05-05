/**
 * GeminiClientEngine — HTTP client for Google's Gemini API.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-GEMINI.
 *
 * Adds Gemini as a 5th voice in the multi-model consensus pool.
 *
 * Why Gemini matters for consensus:
 *   - Different training data than OpenAI/xAI/Anthropic/Mistral derivatives
 *   - Independent failure modes — when 4 vendors agree, signal is very strong
 *   - Gemini 1.5 Pro has long context (2M tokens) — can carry full PRISM context
 *     bundle without budget compression
 *   - Free tier (60 RPM) at aistudio.google.com — no credit card required
 *
 * IMPORTANT — subscription vs API distinction (same lesson as Grok):
 *   - Google One AI Premium / "Gemini Pro" subscription ($19.99/mo) is the
 *     CHATBOT at gemini.google.com. It does NOT include API access.
 *   - The API key from aistudio.google.com is SEPARATE. Free tier 60 RPM.
 *   - Set env GEMINI_API_KEY (or GOOGLE_API_KEY as fallback). Engine will
 *     report `notConfigured: true` and short-circuit if neither is set.
 *
 * Design
 * ------
 * Native fetch() to https://generativelanguage.googleapis.com/v1beta/models/
 * <model>:generateContent. AbortController-driven timeout. No SDK dependency.
 *
 * Reasoning effort maps to Google's `thinkingConfig.thinkingBudget`:
 *   low    → thinkingBudget: 0     (no extended thinking)
 *   medium → thinkingBudget: 4096  (light thinking)
 *   high   → thinkingBudget: 24576 (extended thinking)
 *   xhigh  → thinkingBudget: -1    (dynamic, model decides)
 *
 * Default model `gemini-3-pro-preview` (env override `PRISM_GEMINI_MODEL`).
 * Free-tier API keys are limit:0 on Pro models — switch to `gemini-2.5-flash`
 * for unpaid keys, or use Gemini Advanced subscription via OAuth/CLI path.
 *
 * @module engines/GeminiClientEngine
 */

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

export interface GeminiInput {
  prompt: string;
  /** Default `gemini-2.0-flash-exp`. Override to `gemini-1.5-pro` for deep reasoning. */
  model?: string;
  /** low/medium/high/xhigh — maps to thinkingBudget. Default medium. */
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  timeoutMs?: number;
  /** Override env-derived API key. */
  apiKey?: string;
  /** Optional system prompt (uses systemInstruction). */
  system?: string;
  /** Sampler temperature. Default 0.2. */
  temperature?: number;
  /** Max output tokens. Default 4096. */
  maxOutputTokens?: number;
}

export interface GeminiResult {
  ok: boolean;
  model: string;
  answer: string;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  error: string | null;
  notConfigured: boolean;
  thinkingBudgetUsed: number;
}

const DEFAULT_MODEL = process.env.PRISM_GEMINI_MODEL ?? "gemini-3-pro-preview";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * When REST returns the free-tier `limit: 0` 429 on a Pro model, fall back
 * to the local Gemini CLI (which routes through Google One AI Premium /
 * Gemini Advanced subscription via OAuth). The CLI is much slower (10-15s
 * vs 2-3s for REST) but unlocks Pro models without paid API billing.
 *
 * Set PRISM_GEMINI_PREFER_CLI=1 to skip REST entirely and always use the
 * CLI — useful when REST quota is known-empty.
 *
 * Set PRISM_GEMINI_DISABLE_CLI=1 to force REST-only (e.g. in CI/tests).
 *
 * Read at call time, not module load, so tests can toggle via env in
 * beforeEach() without re-importing the module.
 */
function preferCli(): boolean { return process.env.PRISM_GEMINI_PREFER_CLI === "1"; }
function disableCli(): boolean { return process.env.PRISM_GEMINI_DISABLE_CLI === "1"; }

const THINKING_BUDGETS: Record<NonNullable<GeminiInput["reasoningEffort"]>, number> = {
  low:    0,
  medium: 4096,
  high:   24576,
  xhigh:  -1, // dynamic per Google docs
};

export class GeminiClientEngine {
  async exec(input: GeminiInput): Promise<GeminiResult> {
    this.validate(input);
    const model = input.model ?? DEFAULT_MODEL;
    const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
    const reasoning = input.reasoningEffort ?? "medium";
    const thinkingBudget = THINKING_BUDGETS[reasoning];

    // CLI-first path — when explicitly preferred OR no API key OR Pro model
    // (which is limit:0 on free tier). The CLI uses the user's verified
    // Google One AI Premium / Gemini Advanced OAuth session.
    const cliDisabled = disableCli();
    const cliBin = !cliDisabled ? this.findCli() : null;
    const isProModel = /pro/i.test(model);
    const cliFirst = !cliDisabled && cliBin && (preferCli() || apiKey.length === 0 || isProModel);

    if (cliFirst) {
      const r = await this.execViaCli(input, model, cliBin!, thinkingBudget);
      if (r.ok || apiKey.length === 0) return r;
      // CLI failed but we have a key — fall through to REST as last resort
    }

    if (apiKey.length === 0) {
      return {
        ok: false,
        model,
        answer: "",
        latencyMs: 0,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        error: "GEMINI_API_KEY (or GOOGLE_API_KEY) env var not set, and Gemini CLI not available — get a free key at https://aistudio.google.com/app/apikey OR install via: npm i -g @google/gemini-cli",
        notConfigured: true,
        thinkingBudgetUsed: thinkingBudget,
      };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          temperature: input.temperature ?? DEFAULT_TEMPERATURE,
          maxOutputTokens: input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        },
      };
      if (input.system) {
        body.systemInstruction = { role: "system", parts: [{ text: input.system }] };
      }
      // Only add thinkingConfig for models that support it (the *-thinking* models).
      // For non-thinking models passing thinkingConfig causes 400 — gate on model name.
      if (/thinking|reasoning/i.test(model)) {
        (body.generationConfig as Record<string, unknown>).thinkingConfig = { thinkingBudget };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        // Auto-fallback: REST returned limit:0 (free-tier Pro quota). Try the
        // CLI which routes through the user's Gemini Advanced subscription.
        const isLimitZero = res.status === 429 && /limit:\s*0/.test(errBody);
        if (isLimitZero && cliBin) {
          const cliResult = await this.execViaCli(input, model, cliBin, thinkingBudget);
          if (cliResult.ok) return cliResult;
        }
        return {
          ok: false,
          model,
          answer: "",
          latencyMs,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          error: `HTTP ${res.status}: ${errBody.slice(0, 500)}`,
          notConfigured: false,
          thinkingBudgetUsed: thinkingBudget,
        };
      }

      const json = await res.json() as GeminiResponseShape;
      const answer = this.extractAnswer(json);
      const usage = json.usageMetadata ?? {};

      return {
        ok: true,
        model,
        answer,
        latencyMs,
        promptTokens: usage.promptTokenCount ?? null,
        completionTokens: usage.candidatesTokenCount ?? null,
        totalTokens: usage.totalTokenCount ?? null,
        error: null,
        notConfigured: false,
        thinkingBudgetUsed: thinkingBudget,
      };
    } catch (e) {
      const latencyMs = Date.now() - start;
      const err = e as Error;
      const isAbort = err.name === "AbortError";
      return {
        ok: false,
        model,
        answer: "",
        latencyMs,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        error: isAbort ? `timeout after ${timeoutMs}ms` : err.message,
        notConfigured: false,
        thinkingBudgetUsed: thinkingBudget,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Returns true when GEMINI_API_KEY (or GOOGLE_API_KEY) is set. */
  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
    return key.length > 0;
  }

  // ---- internals ----

  private extractAnswer(json: GeminiResponseShape): string {
    const cand = json.candidates?.[0];
    if (!cand) return "";
    const parts = cand.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("").trim();
  }

  private validate(input: GeminiInput): void {
    if (!input || typeof input !== "object") throw new Error("GeminiInput required");
    if (typeof input.prompt !== "string" || input.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (input.timeoutMs !== undefined && (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0)) {
      throw new Error("timeoutMs must be a positive number");
    }
  }

  /**
   * Locate the local Gemini CLI binary. Returns the first existing path:
   *   1. PRISM_GEMINI_CLI_BIN env override
   *   2. H:/Tools/nodejs/gemini.cmd (PRISM portable bundle on Windows)
   *   3. AppData/Roaming/npm/gemini.cmd (Windows global npm)
   *   4. /usr/local/bin/gemini (POSIX)
   * Returns null when no candidate exists.
   */
  findCli(): string | null {
    if (process.env.PRISM_GEMINI_CLI_BIN && existsSync(process.env.PRISM_GEMINI_CLI_BIN)) {
      return process.env.PRISM_GEMINI_CLI_BIN;
    }
    const candidates = process.platform === "win32"
      ? [
          "H:/Tools/nodejs/gemini.cmd",
          `${process.env.APPDATA ?? ""}\\npm\\gemini.cmd`,
          `${process.env.APPDATA ?? ""}/npm/gemini.cmd`,
        ]
      : [
          "/usr/local/bin/gemini",
          `${process.env.HOME ?? ""}/.local/bin/gemini`,
        ];
    for (const c of candidates) {
      try { if (existsSync(c)) return c; } catch { /* ignore */ }
    }
    return null;
  }

  /**
   * Invoke the Gemini CLI as a subprocess. Used when REST returns
   * `limit: 0` (free-tier Pro quota) or when PRISM_GEMINI_PREFER_CLI=1.
   * The CLI uses Google One AI Premium / Gemini Advanced via OAuth.
   *
   * Windows quirk: spawn(.cmd, [args]) without shell:true returns EINVAL
   * because CreateProcess can't execute .cmd directly. We use cmd.exe /c
   * explicitly so Node passes argv as-is and only cmd.exe handles the .cmd
   * dispatch — same pattern as smoke-gemini-3-pro.mts.
   */
  async execViaCli(input: GeminiInput, model: string, bin: string, thinkingBudget: number): Promise<GeminiResult> {
    const start = Date.now();
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return await new Promise<GeminiResult>((resolve) => {
      let stdout = "";
      let stderr = "";
      const isWindows = process.platform === "win32";
      const cmdExe = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\cmd.exe`;
      // Windows cmd.exe has an ~8K-32K argv limit. PRISM context injection
      // (24K+ chars) blows past it. Use a tiny -p marker and pipe the real
      // prompt via stdin — Gemini CLI appends stdin to the -p argument.
      const cliArgs = ["--skip-trust", "-m", model, "-p", "(see stdin)"];
      const exe = isWindows ? cmdExe : bin;
      const args = isWindows ? ["/c", bin, ...cliArgs] : cliArgs;

      let child;
      try {
        child = spawn(exe, args, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          shell: false,
        });
      } catch (e) {
        return resolve(this.cliFailure(start, model, thinkingBudget, `spawn failed: ${(e as Error).message ?? e}`));
      }

      // Pipe the full prompt to stdin; CLI concatenates this with -p value.
      try {
        child.stdin?.setDefaultEncoding("utf-8");
        child.stdin?.write(input.prompt);
        child.stdin?.end();
      } catch (e) {
        return resolve(this.cliFailure(start, model, thinkingBudget, `stdin write failed: ${(e as Error).message ?? e}`));
      }

      const timer = setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, timeoutMs);
      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (c) => { stdout += c; });
      child.stderr.on("data", (c) => { stderr += c; });
      child.on("error", (err) => {
        clearTimeout(timer);
        resolve(this.cliFailure(start, model, thinkingBudget, `process error: ${err.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const merged = `${stdout}\n${stderr}`;
        if (/Verify your account to continue/i.test(merged)) {
          return resolve(this.cliFailure(start, model, thinkingBudget, "Google account requires verification — see GEMINI-3-PRO-VERIFICATION.md"));
        }
        const cleaned = stdout.split("\n")
          .filter((l) => !l.startsWith("'chcp'") && !l.startsWith("Warning:") && !l.startsWith("Ripgrep") && !l.startsWith("Loaded"))
          .join("\n").trim();
        if (code !== 0 && cleaned.length === 0) {
          return resolve(this.cliFailure(start, model, thinkingBudget, `exit ${code}: ${stderr.slice(-300)}`));
        }
        resolve({
          ok: true,
          model,
          answer: cleaned,
          latencyMs: Date.now() - start,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          error: null,
          notConfigured: false,
          thinkingBudgetUsed: thinkingBudget,
        });
      });
    });
  }

  private cliFailure(start: number, model: string, thinkingBudget: number, error: string): GeminiResult {
    return {
      ok: false,
      model,
      answer: "",
      latencyMs: Date.now() - start,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      error: `CLI: ${error}`,
      notConfigured: false,
      thinkingBudgetUsed: thinkingBudget,
    };
  }
}

interface GeminiResponseShape {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export const geminiClientEngine = new GeminiClientEngine();
