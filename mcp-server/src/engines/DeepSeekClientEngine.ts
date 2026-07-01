// WIRE-EXEMPT: internal LLM API client consumed by MultiModelConsensusEngine (octopus); not a user-facing dispatcher action.
/**
 * DeepSeekClientEngine — HTTP client for DeepSeek's hosted API.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / DEEPSEEK.
 *
 * Wraps the OpenAI-compatible /v1/chat/completions endpoint at api.deepseek.com.
 * Default model: deepseek-chat (V3.2 production). Reasoner variant available.
 *
 * Why this exists: DeepSeek-V3.2 is a 685B-param MoE model — physically too
 * large to run locally on RTX 3080/4080. Using DeepSeek's hosted API gives us
 * V3.2 as a 5th consensus voice for ~$0.14/M input + $0.28/M output (1/30th
 * Claude's price), with comparable reasoning quality on coding/math tasks.
 *
 * Auth: requires `DEEPSEEK_API_KEY` env var. Get one at
 * https://platform.deepseek.com/api_keys (no subscription required, pay-as-you-go).
 *
 * @module engines/DeepSeekClientEngine
 */

export interface DeepSeekExecOptions {
  prompt: string;
  /**
   * Default: deepseek-chat (V3.2). Use "deepseek-reasoner" for R1-style
   * extended chain-of-thought (slower, more tokens, higher quality on
   * math/proof tasks).
   */
  model?: string;
  /** API key. Falls back to process.env.DEEPSEEK_API_KEY. */
  apiKey?: string;
  /** Default 0.2 — drafts should be deterministic. */
  temperature?: number;
  /** Default 1024. Max varies by model — chat=8192, reasoner=8192. */
  maxTokens?: number;
  /** Optional system prompt prepended to the conversation. */
  system?: string;
  /** Default 60_000ms. Reasoner can take 90s+; bump for that. */
  timeoutMs?: number;
}

export interface DeepSeekResult {
  ok: boolean;
  answer: string;
  /** Reasoner-only: separate chain-of-thought trace (deepseek-reasoner field). */
  reasoning: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  model: string;
  latencyMs: number;
  error: string | null;
}

const DEFAULT_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
const DEFAULT_MODEL = process.env.PRISM_DEEPSEEK_MODEL ?? "deepseek-chat";
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_DEEPSEEK_TIMEOUT_MS ?? 60_000);

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
      /** Non-standard OpenAI extension: deepseek-reasoner returns CoT separately. */
      reasoning_content?: string;
    };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string };
}

export class DeepSeekClientEngine {
  async exec(options: DeepSeekExecOptions): Promise<DeepSeekResult> {
    this.validate(options);
    const start = Date.now();
    const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
    if (!apiKey) {
      return this.fail(start, options.model ?? DEFAULT_MODEL,
        "missing DEEPSEEK_API_KEY env var (get a key at https://platform.deepseek.com/api_keys)");
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
      const reasoning = parsed.choices?.[0]?.message?.reasoning_content ?? null;
      if (answer.length === 0) {
        return this.fail(start, model, `empty assistant content (raw: ${text.slice(0, 200)})`);
      }

      return {
        ok: true,
        answer,
        reasoning,
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

  private fail(start: number, model: string, error: string): DeepSeekResult {
    return {
      ok: false,
      answer: "",
      reasoning: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      model,
      latencyMs: Date.now() - start,
      error,
    };
  }

  private validate(opts: DeepSeekExecOptions): void {
    if (!opts || typeof opts !== "object") throw new Error("DeepSeekExecOptions required");
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

export const deepSeekClientEngine = new DeepSeekClientEngine();
