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
  /**
   * U-OCN01: SSE streaming. When `true`, the engine sets `stream: true` on the
   * request body, parses `data: {...}` SSE frames, accumulates `delta.content`
   * across frames, and returns the assembled final text as `answer` (same shape
   * as non-streaming). Default: false. If the client aborts mid-stream, the
   * engine returns `ok: false, error: "stream cancelled"` (or "timeout" if it
   * was the timeout-driven abort).
   */
  stream?: boolean;
  /**
   * U-OCN01: Retry budget for transient errors (HTTP 429 / 502 / 503 / 504 and
   * network-level fetch failures). Auth errors (401/403), invalid-JSON, hard
   * 4xx (other than 429), and explicit timeout-aborts do NOT retry. Default 2
   * (so up to 3 total attempts: initial + 2 retries). Set to 0 to disable.
   * Backoff: 250ms, 750ms, 1500ms (with the optional `retryBaseDelayMs` knob
   * for tests so they don't spend real seconds sleeping).
   */
  retries?: number;
  /** Test-injection knob: base delay (ms) for backoff. Default 250. */
  retryBaseDelayMs?: number;
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
  /** U-OCN01: number of times we retried after a transient failure. 0 = no retry needed. */
  retries: number;
  /** U-OCN01: true if the answer was assembled from an SSE stream rather than a single JSON body. */
  streamed: boolean;
}

const DEFAULT_BASE_URL = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1";
const DEFAULT_MODEL = process.env.PRISM_MOONSHOT_MODEL ?? "kimi-k2-0905-preview";
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_MOONSHOT_TIMEOUT_MS ?? 60_000);
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_BASE_MS = 250;
/** Transient HTTP statuses that we retry. 429 is rate-limit; 5xx is server-side. */
const RETRIABLE_STATUSES = new Set([429, 502, 503, 504]);

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string };
}

/**
 * U-OCN01: classifies an attempt outcome. `retryable` means we should sleep
 * backoff and try again (up to the retry budget). `done` means the attempt
 * produced a final answer that exec() should return as-is. `fatal` means a
 * non-retryable error (auth, invalid JSON, explicit timeout): stop and return.
 */
type AttemptKind = "done" | "retryable" | "fatal";
interface AttemptOutcome {
  kind: AttemptKind;
  result: MoonshotResult;
}

export class MoonshotClientEngine {
  async exec(options: MoonshotExecOptions): Promise<MoonshotResult> {
    this.validate(options);
    const start = Date.now();
    const model = options.model ?? DEFAULT_MODEL;
    const streamed = options.stream === true;

    const apiKey = options.apiKey ?? process.env.MOONSHOT_API_KEY ?? "";
    if (!apiKey) {
      return this.fail(start, model, 0, streamed,
        "missing MOONSHOT_API_KEY env var (get a key at https://platform.moonshot.ai/console/api-keys)");
    }

    const retryBudget = Math.max(0, options.retries ?? DEFAULT_RETRIES);
    const baseDelay = Math.max(0, options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_MS);
    let retries = 0;
    let lastOutcome: AttemptOutcome | null = null;

    // Initial attempt + up to `retryBudget` retries on transient failures.
    for (let i = 0; i <= retryBudget; i++) {
      const outcome = streamed
        ? await this.streamAttempt(options, model, apiKey, start, retries)
        : await this.unaryAttempt(options, model, apiKey, start, retries);
      lastOutcome = outcome;
      if (outcome.kind !== "retryable" || i === retryBudget) return outcome.result;
      // Exponential backoff: baseDelay × 2^retries → 250, 500, 1000, …
      // (assuming DEFAULT_RETRY_BASE_MS; tests inject 0 to skip the sleep).
      await this.sleep(baseDelay * Math.pow(2, retries));
      retries++;
    }
    // Loop guarantees a return; this is just for the type checker.
    return lastOutcome!.result;
  }

  // ---- internals ----

  /** Single non-streaming HTTP attempt — returns one AttemptOutcome. */
  private async unaryAttempt(
    options: MoonshotExecOptions,
    model: string,
    apiKey: string,
    start: number,
    retries: number,
  ): Promise<AttemptOutcome> {
    const body = this.buildRequestBody(options, model, false);
    const ctrl = new AbortController();
    let aborted = false;
    const timer = setTimeout(() => { aborted = true; ctrl.abort(); }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const r = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await r.text();
      let parsed: OpenAIChatResponse;
      try { parsed = JSON.parse(text); }
      catch {
        // Invalid JSON is a server protocol violation — don't retry.
        return { kind: "fatal", result: this.fail(start, model, retries, false,
          `non-JSON response (http ${r.status}): ${text.slice(0, 200)}`) };
      }

      if (!r.ok) {
        const msg = parsed.error?.message ?? `http ${r.status}`;
        const result = this.fail(start, model, retries, false, msg);
        if (RETRIABLE_STATUSES.has(r.status)) return { kind: "retryable", result };
        return { kind: "fatal", result };
      }

      const answer = parsed.choices?.[0]?.message?.content ?? "";
      if (answer.length === 0) {
        return { kind: "fatal", result: this.fail(start, model, retries, false,
          `empty assistant content (raw: ${text.slice(0, 200)})`) };
      }

      return {
        kind: "done",
        result: {
          ok: true,
          answer,
          promptTokens: parsed.usage?.prompt_tokens ?? null,
          completionTokens: parsed.usage?.completion_tokens ?? null,
          totalTokens: parsed.usage?.total_tokens ?? null,
          model: parsed.model ?? model,
          latencyMs: Date.now() - start,
          error: null,
          retries,
          streamed: false,
        },
      };
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") {
        // Timeout abort is fatal; explicit caller-cancel also surfaces here but we can't
        // distinguish, so report "timeout" only when our own timer fired.
        return { kind: "fatal", result: this.fail(start, model, retries, false, aborted ? "timeout" : "stream cancelled") };
      }
      // Network-level error (DNS, connection reset, etc.) — retryable.
      return { kind: "retryable", result: this.fail(start, model, retries, false, `fetch error: ${err.message}`) };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * SSE-streaming attempt. Parses `data: {...}` lines (per OpenAI/Moonshot
   * streaming spec), accumulates `choices[0].delta.content` into `answer`, and
   * stops at `data: [DONE]`. Returns the assembled answer in the same shape as
   * unaryAttempt. Cancel mid-stream → ok:false, error "stream cancelled".
   */
  private async streamAttempt(
    options: MoonshotExecOptions,
    model: string,
    apiKey: string,
    start: number,
    retries: number,
  ): Promise<AttemptOutcome> {
    const body = this.buildRequestBody(options, model, true);
    const ctrl = new AbortController();
    let aborted = false;
    const timer = setTimeout(() => { aborted = true; ctrl.abort(); }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const r = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        // For streaming errors the body is usually JSON, not SSE.
        let errMsg = `http ${r.status}`;
        try {
          const text = await r.text();
          const parsed = JSON.parse(text) as OpenAIChatResponse;
          errMsg = parsed.error?.message ?? errMsg;
        } catch { /* keep status-only message */ }
        const result = this.fail(start, model, retries, true, errMsg);
        if (RETRIABLE_STATUSES.has(r.status)) return { kind: "retryable", result };
        return { kind: "fatal", result };
      }

      // Read SSE frames. Node's fetch returns r.body as a ReadableStream<Uint8Array>.
      if (!r.body) {
        return { kind: "fatal", result: this.fail(start, model, retries, true, "no response body for stream") };
      }
      let answer = "";
      let usage: OpenAIChatResponse["usage"] | undefined;
      let modelReported = model;
      const decoder = new TextDecoder();
      const reader = (r.body as ReadableStream<Uint8Array>).getReader();
      let leftover = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // SSE frames are line-delimited; the line `data: ...` carries JSON.
          const lines = (leftover + chunk).split("\n");
          leftover = lines.pop() ?? "";
          for (const lineRaw of lines) {
            const line = lineRaw.trim();
            if (line.length === 0 || !line.startsWith("data:")) continue;
            const payload = line.slice("data:".length).trim();
            if (payload === "[DONE]") continue;
            try {
              const frame = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
                usage?: OpenAIChatResponse["usage"];
                model?: string;
              };
              const deltaText = frame.choices?.[0]?.delta?.content;
              if (typeof deltaText === "string") answer += deltaText;
              if (frame.usage) usage = frame.usage;
              if (typeof frame.model === "string") modelReported = frame.model;
            } catch { /* malformed frame — skip, don't tear down the whole stream */ }
          }
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") {
          return { kind: "fatal", result: this.fail(start, model, retries, true, aborted ? "timeout" : "stream cancelled") };
        }
        throw e;
      }
      if (answer.length === 0) {
        return { kind: "fatal", result: this.fail(start, model, retries, true, "empty assistant content (stream produced no delta.content frames)") };
      }
      return {
        kind: "done",
        result: {
          ok: true,
          answer,
          promptTokens: usage?.prompt_tokens ?? null,
          completionTokens: usage?.completion_tokens ?? null,
          totalTokens: usage?.total_tokens ?? null,
          model: modelReported,
          latencyMs: Date.now() - start,
          error: null,
          retries,
          streamed: true,
        },
      };
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") {
        return { kind: "fatal", result: this.fail(start, model, retries, true, aborted ? "timeout" : "stream cancelled") };
      }
      return { kind: "retryable", result: this.fail(start, model, retries, true, `fetch error: ${err.message}`) };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildRequestBody(options: MoonshotExecOptions, model: string, stream: boolean): Record<string, unknown> {
    const messages: Array<{ role: string; content: string }> = [];
    if (options.system) messages.push({ role: "system", content: options.system });
    messages.push({ role: "user", content: options.prompt });
    return {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      stream,
    };
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    return {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }

  private fail(start: number, model: string, retries: number, streamed: boolean, error: string): MoonshotResult {
    return {
      ok: false,
      answer: "",
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      model,
      latencyMs: Date.now() - start,
      error,
      retries,
      streamed,
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
