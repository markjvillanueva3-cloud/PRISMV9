/**
 * GLMClientEngine -- HTTP client for Zhipu AI's GLM API (OpenAI-compatible).
 *
 * Milestone: HERMES-UTIL / OCTOPUS-CONSENSUS / GLM (2026-06-18, slot:zulu, operator
 * "can we incorporate glm5.2 -- lets get it active").
 *
 * Wraps the OpenAI-compatible /chat/completions endpoint at Zhipu (api.z.ai /
 * open.bigmodel.cn paas v4). Adds GLM as a cross-vendor consensus voice -- a clone
 * of the proven MoonshotClientEngine pattern (the established OpenAI-compatible
 * non-US-lab voice path; DeepSeek/Moonshot already ship this shape). Pure HTTP via
 * global fetch -- NO child_process / shell.
 *
 * MODEL: default `glm-4.6` (current stable). To run **GLM-5.2**, set
 * `PRISM_GLM_MODEL=glm-5.2` (env-overridable rather than hardcoded -- the exact
 * 5.2 tag/availability is operator-verified at the endpoint, not baked in here).
 *
 * AUTH: requires `GLM_API_KEY` (or `ZHIPU_API_KEY`). Get one at
 * https://open.bigmodel.cn/ (or the z.ai console). Without a key the engine is a
 * strict no-op (ok:false, "missing key") -- exactly how the other API voices gate,
 * so the consensus engine simply excludes GLM until the key is set ("active").
 *
 * @module engines/GLMClientEngine
 */

export interface GLMExecOptions {
  prompt: string;
  /** Default: glm-4.6. Set PRISM_GLM_MODEL=glm-5.2 (or pass here) for GLM-5.2. */
  model?: string;
  /** API key. Falls back to process.env.GLM_API_KEY ?? process.env.ZHIPU_API_KEY. */
  apiKey?: string;
  /** Default 0.3. */
  temperature?: number;
  /** Default 1024. */
  maxTokens?: number;
  /** Optional system prompt prepended to the conversation. */
  system?: string;
  /** Default 60_000ms. */
  timeoutMs?: number;
  /** SSE streaming. When true, accumulates delta.content frames into `answer`. Default false. */
  stream?: boolean;
  /**
   * Retry budget for transient errors (HTTP 429/502/503/504 + network fetch
   * failures). Auth (401/403), invalid-JSON, hard 4xx, and timeout-aborts do NOT
   * retry. Default 2 (3 total attempts). Set 0 to disable.
   */
  retries?: number;
  /** Test-injection: base backoff delay (ms). Default 250. */
  retryBaseDelayMs?: number;
}

export interface GLMResult {
  ok: boolean;
  answer: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  model: string;
  latencyMs: number;
  error: string | null;
  retries: number;
  streamed: boolean;
}

const DEFAULT_BASE_URL = process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";
/** Fallback model when neither the call option nor PRISM_GLM_MODEL is set. */
const FALLBACK_MODEL = "glm-4.6";
/**
 * Resolve the model at CALL time (not module-load) so an operator who sets
 * PRISM_GLM_MODEL=glm-5.2 AFTER the process launched still gets it -- the
 * activation knob must not be frozen at import. Priority: explicit option >
 * PRISM_GLM_MODEL env > glm-4.6 fallback.
 */
function resolveModel(optModel?: string): string {
  return optModel ?? process.env.PRISM_GLM_MODEL ?? FALLBACK_MODEL;
}
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_GLM_TIMEOUT_MS ?? 60_000);
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_BASE_MS = 250;
/** Transient HTTP statuses we retry. 429 = rate-limit; 5xx = server-side. */
const RETRIABLE_STATUSES = new Set([429, 502, 503, 504]);

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string };
}

type AttemptKind = "done" | "retryable" | "fatal";
interface AttemptOutcome {
  kind: AttemptKind;
  result: GLMResult;
}

export class GLMClientEngine {
  async run(options: GLMExecOptions): Promise<GLMResult> {
    this.validate(options);
    const start = Date.now();
    const model = resolveModel(options.model);
    const streamed = options.stream === true;

    const apiKey = options.apiKey ?? process.env.GLM_API_KEY ?? process.env.ZHIPU_API_KEY ?? "";
    if (!apiKey) {
      return this.fail(start, model, 0, streamed,
        "missing GLM_API_KEY / ZHIPU_API_KEY env var (get a key at https://open.bigmodel.cn/)");
    }

    const retryBudget = Math.max(0, options.retries ?? DEFAULT_RETRIES);
    const baseDelay = Math.max(0, options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_MS);
    let retries = 0;
    let lastOutcome: AttemptOutcome | null = null;

    for (let i = 0; i <= retryBudget; i++) {
      const outcome = streamed
        ? await this.streamAttempt(options, model, apiKey, start, retries)
        : await this.unaryAttempt(options, model, apiKey, start, retries);
      lastOutcome = outcome;
      if (outcome.kind !== "retryable" || i === retryBudget) return outcome.result;
      await this.sleep(baseDelay * Math.pow(2, retries));
      retries++;
    }
    return lastOutcome!.result;
  }

  // ---- internals ----

  private async unaryAttempt(
    options: GLMExecOptions,
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
        return { kind: "fatal", result: this.fail(start, model, retries, false, aborted ? "timeout" : "stream cancelled") };
      }
      return { kind: "retryable", result: this.fail(start, model, retries, false, `fetch error: ${err.message}`) };
    } finally {
      clearTimeout(timer);
    }
  }

  private async streamAttempt(
    options: GLMExecOptions,
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
            } catch { /* malformed frame -- skip */ }
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

  private buildRequestBody(options: GLMExecOptions, model: string, stream: boolean): Record<string, unknown> {
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

  private fail(start: number, model: string, retries: number, streamed: boolean, error: string): GLMResult {
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

  /** Is a GLM key present? Mirrors the consensus includeX gate (no IO). */
  isAvailable(): boolean {
    return !!(process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY);
  }

  private validate(opts: GLMExecOptions): void {
    if (!opts || typeof opts !== "object") throw new Error("GLMExecOptions required");
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

export const glmClientEngine = new GLMClientEngine();
