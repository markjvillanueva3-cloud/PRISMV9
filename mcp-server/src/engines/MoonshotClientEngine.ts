/**
 * MoonshotClientEngine — HTTP client for Moonshot AI's Kimi API.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / MOONSHOT.
 *
 * Wraps the OpenAI-compatible /v1/chat/completions endpoint at api.moonshot.ai.
 * Default model: kimi-k2 (1T-param MoE, 32B activated, ~Sept 2025).
 *
 * Why this exists: Kimi-K2 is a ~1T-param MoE model — physically too large to
 * run on RTX 3080/4080 (needs 120GB+ HBM). Using Moonshot's hosted API gives
 * us Kimi-K2 as a 6th consensus voice known for strong long-context (200K+)
 * and tool-use capabilities. Pricing: ~$0.15/M input, ~$2.50/M output (cheap
 * input, premium output — best for short-prompt long-answer tasks).
 *
 * Auth: requires `MOONSHOT_API_KEY` env var. Get one at
 * https://platform.moonshot.ai/console/api-keys (pay-as-you-go).
 *
 * @module engines/MoonshotClientEngine
 */

export interface MoonshotExecOptions {
  prompt: string;
  /**
   * Default: kimi-k2-0905-preview (latest Kimi-K2). Other options:
   * moonshot-v1-32k, moonshot-v1-128k (older, cheaper for long context).
   */
  model?: string;
  /** API key. Falls back to process.env.MOONSHOT_API_KEY. */
  apiKey?: string;
  /** Default 0.3 — Moonshot recommends slightly higher than other vendors. */
  temperature?: number;
  /** Default 1024. K2 supports up to 8192 output tokens. */
  maxTokens?: number;
  /** Optional system prompt prepended to the conversation. */
  system?: string;
  /** Default 60_000ms. Long-context K2 calls can take 90s+. */
  timeoutMs?: number;
}

export interface MoonshotResult {
  ok: boolean;
  answer: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  model: string;
  latencyMs: number;
  error: string | null;
}

const DEFAULT_BASE_URL = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1";
const DEFAULT_MODEL = process.env.PRISM_MOONSHOT_MODEL ?? "kimi-k2-0905-preview";
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_MOONSHOT_TIMEOUT_MS ?? 60_000);

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string };
}

export class MoonshotClientEngine {
  async exec(options: MoonshotExecOptions): Promise<MoonshotResult> {
    this.validate(options);
    const start = Date.now();
    const apiKey = options.apiKey ?? process.env.MOONSHOT_API_KEY ?? "";
    if (!apiKey) {
      return this.fail(start, options.model ?? DEFAULT_MODEL,
        "missing MOONSHOT_API_KEY env var (get a key at https://platform.moonshot.ai/console/api-keys)");
    }

    const model = options.model ?? DEFAULT_MODEL;
    const messages: Array<{ role: string; content: string }> = [];
    if (options.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: options.prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      stream: false,
    };

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

  private fail(start: number, model: string, error: string): MoonshotResult {
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

  private validate(opts: MoonshotExecOptions): void {
    if (!opts || typeof opts !== "object") throw new Error("MoonshotExecOptions required");
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
  }
}

export const moonshotClientEngine = new MoonshotClientEngine();
