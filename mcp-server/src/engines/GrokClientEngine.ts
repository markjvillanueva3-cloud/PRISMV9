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
 * WIRE-EXEMPT: a provider CLIENT, not a dispatcher action. Consumed by
 * MultiModelConsensusEngine (the octopus consensus, wired via prism_ai:consensus)
 * and GrokCLIClientEngine -- never a direct dispatcher case. Companion test:
 * src/__tests__/GrokClient.test.ts.
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

// -- HERMES-OAUTH-PROXY TRANSPORT (slot:zulu, OCTOPUS-HERMES-SYNERGY 2026-06-23) --
// The octopus Grok voice has historically required XAI_API_KEY (the HTTP API) or
// the keyless `grok` CLI on PATH. The local Hermes proxy (`hermes proxy start`) is
// a THIRD transport to the SAME Grok model: an OpenAI-compatible server at :8645
// that forwards to an OAuth-authenticated xAI upstream (the operator's managed
// Grok credential) -- FREE, no API key in env, no CLI binary. When neither key nor
// CLI is present but the proxy is up + authenticated, routing the Grok voice here
// gives the consensus a real non-Ollama cloud voice at $0. One voice, three
// transports -- never two at once (callGrok seats exactly one backend, R7). The
// proxy resolves the served model itself (it maps the requested id -> its live
// upstream, e.g. grok-4 -> grok-4.3), so the requested id is only a hint.
const HERMES_PROXY_BASE = process.env.PRISM_HERMES_PROXY_URL ?? "http://127.0.0.1:8645/v1";
// HERMES-NVIDIA-LANE (2026-06-30): the :8645 OAuth proxy IGNORES the bearer (attaches the real OAuth
// cred), but when PRISM_HERMES_PROXY_URL is repointed at a DIRECT cloud lane (NVIDIA, after xAI OAuth
// died) the endpoint REQUIRES the key. Fall back to NVIDIA_API_KEY (already in the fleet env) so the
// octopus Hermes voices reach the live model; the local-proxy path is byte-identical (bearer ignored).
const HERMES_PROXY_TOKEN = process.env.PRISM_HERMES_TOKEN ?? process.env.NVIDIA_API_KEY ?? "prism";
const HERMES_PROXY_MODEL = process.env.PRISM_HERMES_MODEL ?? DEFAULT_MODEL;
const HERMES_PROBE_TTL_MS = Number(process.env.PRISM_HERMES_PROBE_TTL_MS ?? 30_000);
const HERMES_PROBE_TIMEOUT_MS = Number(process.env.PRISM_HERMES_PROBE_TIMEOUT_MS ?? 1500);

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

  // ---- Hermes OAuth-proxy transport (3rd Grok backend) ----

  private hermesProbeCache: { at: number; ok: boolean } | null = null;

  /**
   * Reset the memoized hermes-proxy reachability cache. Call from tests, or after
   * a known proxy bounce, so the next reachability check re-probes the network.
   */
  resetHermesProbeCache(): void {
    this.hermesProbeCache = null;
  }

  /**
   * Is the local Hermes OAuth proxy up AND authenticated? Memoized (TTL
   * PRISM_HERMES_PROBE_TTL_MS, default 30s) so a consensus run that checks the
   * includeGrok gate AND callGrok only touches the network once. Probes the
   * proxy's `/health` ROOT (NOT under `/v1`) with a hard timeout. Any failure
   * (down, non-2xx, unauthenticated, malformed body, timeout) -> false:
   * FAIL-CLOSED, because a down proxy must never seat a phantom Grok voice that
   * would record a failed entry in every consensus run.
   *
   * @param opts.force  bypass the memo cache and re-probe (tests + post-bounce)
   * @param opts.timeoutMs  probe timeout (default PRISM_HERMES_PROBE_TIMEOUT_MS = 1500)
   * @returns true only when the proxy reports `{status:"ok", authenticated:true}`
   */
  async hermesProxyReachable(opts?: { force?: boolean; timeoutMs?: number }): Promise<boolean> {
    const now = Date.now();
    if (!opts?.force && this.hermesProbeCache && now - this.hermesProbeCache.at < HERMES_PROBE_TTL_MS) {
      return this.hermesProbeCache.ok;
    }
    const healthUrl = HERMES_PROXY_BASE.replace(/\/v1\/?$/, "") + "/health";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? HERMES_PROBE_TIMEOUT_MS);
    let ok = false;
    try {
      const r = await fetch(healthUrl, { signal: ctrl.signal });
      if (r.ok) {
        const j = (await r.json().catch(() => ({}))) as { status?: string; authenticated?: boolean };
        ok = j?.status === "ok" && j?.authenticated === true;
      }
      // HERMES-NVIDIA-LANE (2026-06-30): a DIRECT cloud lane (NVIDIA, when PRISM_HERMES_PROXY_URL is
      // repointed off the dead :8645 OAuth proxy) has NO root /health -> the probe above stays false,
      // which would seat ZERO Hermes voices in the octopus. Fall back to an authed /models probe: a 200
      // proves the lane can serve a consensus voice right now. Local-proxy path is unaffected (its
      // /health already returned a verdict above; this only runs when /health did not confirm ok).
      if (!ok) {
        const mr = await fetch(`${HERMES_PROXY_BASE.replace(/\/+$/, "")}/models`, {
          headers: HERMES_PROXY_TOKEN ? { authorization: `Bearer ${HERMES_PROXY_TOKEN}` } : {},
          signal: ctrl.signal,
        });
        ok = mr.ok;
      }
    } catch {
      ok = false;
    } finally {
      clearTimeout(timer);
    }
    this.hermesProbeCache = { at: now, ok };
    return ok;
  }

  /**
   * Run a Grok completion through the local Hermes OAuth proxy
   * (OpenAI-compatible `/v1/chat/completions` at :8645). Same request/response
   * contract as the direct-API path but targets the proxy -- which attaches the
   * real managed OAuth credential, so NO api key is sent -- and lets the proxy
   * resolve the served Grok model (it maps the requested id to its live
   * upstream). The Grok-4 `reasoning_effort` field is intentionally OMITTED: the
   * proxy/model decides its own reasoning mode and an unknown field can be
   * rejected. Returns the SAME GrokResult shape so callers (callGrok) are
   * transport-agnostic; r.model carries the TRUE served model for the consensus
   * ledger. Never returns a "missing XAI_API_KEY" error -- that is the
   * direct-API path's job.
   */
  async execViaHermesProxy(options: GrokExecOptions): Promise<GrokResult> {
    this.validate(options);
    const start = Date.now();
    const model = options.model ?? HERMES_PROXY_MODEL;
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
      const r = await fetch(`${HERMES_PROXY_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${HERMES_PROXY_TOKEN}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await r.text();
      let parsed: OpenAIChatResponse;
      try { parsed = JSON.parse(text) as OpenAIChatResponse; }
      catch { return this.fail(start, model, `hermes-proxy non-JSON response (http ${r.status}): ${text.slice(0, 200)}`); }

      if (!r.ok) {
        const msg = parsed.error?.message ?? `http ${r.status}`;
        return this.fail(start, model, `hermes-proxy: ${msg}`);
      }

      const answer = parsed.choices?.[0]?.message?.content ?? "";
      if (answer.length === 0) {
        return this.fail(start, model, `hermes-proxy empty assistant content (raw: ${text.slice(0, 200)})`);
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
      if (err.name === "AbortError") return this.fail(start, model, "hermes-proxy timeout");
      return this.fail(start, model, `hermes-proxy fetch error: ${err.message}`);
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
