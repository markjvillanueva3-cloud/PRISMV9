/**
 * GrokClientEngine — HTTP client for xAI's Grok API.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / GROK.
 *
 * Wraps the OpenAI-compatible /v1/chat/completions endpoint at api.x.ai.
 * Default model: grok-4 (most powerful, supports reasoning mode).
 *
 * Auth: requires `XAI_API_KEY` env var (or pass apiKey explicitly). Premium
 * Grok subscriptions include API credits — get a key from console.x.ai.
 *
 * @module engines/GrokClientEngine
 */

export interface GrokExecOptions {
  prompt: string;
  /** Default: grok-4. Other options: grok-4-mini, grok-3, grok-3-mini, grok-code-fast-1. */
  model?: string;
  /** xAI API key. Falls back to process.env.XAI_API_KEY. */
  apiKey?: string;
  /** Default 0.2 — drafts should be deterministic. */
  temperature?: number;
  /** Default 1024. */
  maxTokens?: number;
  /** Optional system prompt prepended to the conversation. */
  system?: string;
  /** Default 60_000ms. */
  timeoutMs?: number;
  /**
   * Reasoning effort for grok-4 thinking mode. Maps to xAI's reasoning_effort
   * field. Default "medium" — "high" for high-stakes consensus calls.
   */
  reasoningEffort?: "low" | "medium" | "high";
}

export interface GrokResult {
  ok: boolean;
  answer: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  model: string;
  latencyMs: number;
  error: string | null;
}

const DEFAULT_BASE_URL = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
const DEFAULT_MODEL = process.env.PRISM_GROK_MODEL ?? "grok-4";
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_GROK_TIMEOUT_MS ?? 60_000);
const DEFAULT_REASONING = (process.env.PRISM_GROK_REASONING ?? "medium") as GrokExecOptions["reasoningEffort"];

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string };
}

export class GrokClientEngine {
  async exec(options: GrokExecOptions): Promise<GrokResult> {
    this.validate(options);
    const start = Date.now();
    const apiKey = options.apiKey ?? process.env.XAI_API_KEY ?? "";
    if (!apiKey) {
      return this.fail(start, options.model ?? DEFAULT_MODEL,
        "missing XAI_API_KEY env var (get a key from https://console.x.ai/)");
    }

    const model = options.model ?? DEFAULT_MODEL;
    const messages: Array<{ role: string; content: string }> = [];
    if (options.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: options.prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1024,
      stream: false,
    };
    // Grok-4 thinking mode
    if (model.startsWith("grok-4")) {
      body.reasoning_effort = options.reasoningEffort ?? DEFAULT_REASONING;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const r = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await r.text();
      let parsed: OpenAIChatResponse;
      try { parsed = JSON.parse(text); }
      catch { return this.fail(start, model, `non-JSON response (http ${r.status}): ${text.slice(0, 200)}`); }

      if (!r.ok) {
        const msg = parsed.error?.message ?? `http ${r.status}`;
        return this.fail(start, model, msg);
      }

      const answer = parsed.choices?.[0]?.message?.content ?? "";
      if (answer.length === 0) {
        return this.fail(start, model, `empty assistant content (raw: ${text.slice(0, 200)})`);
      }

      return {
        ok: true,
        answer,
        promptTokens: parsed.usage?.prompt_tokens ?? null,
        completionTokens: parsed.usage?.completion_tokens ?? null,
        totalTokens: parsed.usage?.total_tokens ?? null,
        model: parsed.model ?? model,
        latencyMs: Date.now() - start,
        error: null,
      };
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return this.fail(start, model, "timeout");
      return this.fail(start, model, `fetch error: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- internals ----

  private fail(start: number, model: string, error: string): GrokResult {
    return {
      ok: false,
      answer: "",
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      model,
      latencyMs: Date.now() - start,
      error,
    };
  }

  private validate(opts: GrokExecOptions): void {
    if (!opts || typeof opts !== "object") throw new Error("GrokExecOptions required");
    if (typeof opts.prompt !== "string" || opts.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (opts.timeoutMs !== undefined) {
      if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
        throw new Error("timeoutMs must be a positive number");
      }
    }
    if (opts.temperature !== undefined) {
      if (!Number.isFinite(opts.temperature) || opts.temperature < 0 || opts.temperature > 2) {
        throw new Error("temperature must be in [0, 2]");
      }
    }
    if (opts.maxTokens !== undefined) {
      if (!Number.isInteger(opts.maxTokens) || opts.maxTokens <= 0) {
        throw new Error("maxTokens must be a positive integer");
      }
    }
    if (opts.reasoningEffort !== undefined) {
      const valid = ["low", "medium", "high"];
      if (!valid.includes(opts.reasoningEffort)) {
        throw new Error(`reasoningEffort must be one of ${valid.join("|")}`);
      }
    }
  }
}

export const grokClientEngine = new GrokClientEngine();
