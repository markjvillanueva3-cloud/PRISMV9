/**
 * NVIDIALLMCAMEngine — CAM-EXHAUST-MS0/U-CAM113
 *
 * GPU-accelerated CAM inference adapter targeting NVIDIA's local-inference
 * surfaces (NIM containers and Triton Inference Server). The adapter is
 * **feature-detected at runtime** — if no NVIDIA stack is reachable, the
 * engine returns structured errored results so callers can fall back to
 * the OllamaCAMIntegrationEngine (U-CAM112) without a hang or throw.
 *
 * Detection signal precedence:
 *   1. Explicit endpoint via opts.endpoint
 *   2. NVIDIA_NIM_ENDPOINT, TRITON_HTTP_ENDPOINT, or NIM_URL env var
 *      (NIM_URL is PRISM's canonical name — shared with local-llm-bridge.mjs
 *      and the nim-autostart.mjs SessionStart hook; it carries a `/v1` suffix
 *      which resolveEndpoint() strips since the engine appends its own route)
 *   3. Heuristic probe of the configured default endpoint (HTTP HEAD with
 *      short timeout)
 *
 * Used by CAMDeepLearningOrchestratorEngine (U-CAM117) as the high-throughput
 * inference path when GPU is present; otherwise the orchestrator routes to
 * Ollama or pure-physics paths.
 *
 * NOTE: This engine intentionally does NOT depend on the NVIDIA SDK at
 * compile-time. All transport is via fetch(); if the endpoint is absent the
 * engine reports `errorCode: "nvidia_unavailable"` and never throws.
 *
 * Reference: NVIDIA NIM Inference Microservices (2025), NVIDIA Triton
 * Inference Server v25.x — both expose OpenAI-compatible /v1/chat/completions
 * routes for LLM containers (Llama-3, Nemotron, Mistral on Triton).
 */

export type NVIDIACAMTaskKind =
  | "strategy_recommend"
  | "parameter_extract"
  | "operation_classify"
  | "tool_select_advisor";

export interface NVIDIAQueryOptions {
  /** Override endpoint URL. Default: env NVIDIA_NIM_ENDPOINT, TRITON_HTTP_ENDPOINT, or NIM_URL; else http://127.0.0.1:8000. A trailing `/v1` segment is stripped (the engine appends its own `/v1/...` route). */
  endpoint?: string;
  /** Override model name. Default: "meta/llama-3.2-3b-instruct" (the model NIM serves on the default port-8000 endpoint). */
  model?: string;
  /** Bearer token. Default: env NVIDIA_API_KEY. */
  apiKey?: string;
  /** Override timeout. Default 30000ms (covers a NIM's one-time first-request xgrammar grammar-compile; warm requests are ~1-2s). */
  timeoutMs?: number;
  /** Override temperature. Default 0.0 for deterministic CAM output. */
  temperature?: number;
  /** Override max tokens. Default 1024. */
  maxTokens?: number;
}

export interface NVIDIAQueryResult<T = unknown> {
  success: boolean;
  task: NVIDIACAMTaskKind;
  parsed: T | null;
  raw: string | null;
  model: string;
  endpoint: string;
  latencyMs: number;
  errorCode?: NVIDIAErrorCode;
  error?: string;
  /** Inference tokens-per-second when available (NIM reports this). */
  tokensPerSecond?: number;
}

export type NVIDIAErrorCode =
  | "nvidia_unavailable"
  | "nvidia_timeout"
  | "auth_required"
  | "auth_failed"
  | "model_not_found"
  | "empty_response"
  | "json_parse_failed"
  | "schema_mismatch"
  | "rate_limited"
  | "bad_input";

export interface NVIDIAStrategyOutput {
  strategy: string;
  rationale: string;
  alternates: string[];
  confidence: number;
}

export interface NVIDIAParameterOutput {
  parameters: Record<string, string | number | boolean>;
}

export interface NVIDIAOperationClassifyOutput {
  op_type: string;
  family: string;
  confidence: number;
}

export interface NVIDIAToolSelectOutput {
  tool_family: string;
  diameter_mm: number;
  flutes: number;
  rationale: string;
}

export interface NVIDIAHealthResult {
  available: boolean;
  endpoint: string;
  model: string;
  latencyMs: number;
  /** Set when nvidia-smi is reachable; reports SM count + driver. */
  gpuInfo?: { driverVersion: string; deviceCount: number };
  error?: string;
  errorCode?: NVIDIAErrorCode;
}

// ── Bounds and constants ────────────────────────────────────────────────────
const DEFAULT_ENDPOINT = "http://127.0.0.1:8000";
// Matches the model NIM serves on the default port-8000 endpoint: the PRISM
// NIM compose (H:/Tools/nim/compose/rtx4080.yml) binds llama-3.2-3b there.
// The 8b is a separate container on a separate port — callers target it by
// passing opts.model + opts.endpoint explicitly.
const DEFAULT_MODEL = "meta/llama-3.2-3b-instruct";
// 30s: a local NIM's FIRST guided-JSON request (response_format: json_object)
// pays a one-time xgrammar grammar-compile cost that can exceed 12s; warm
// requests return in ~1-2s. Callers may still override via opts.timeoutMs
// (clamped to [TIMEOUT_MIN_MS, TIMEOUT_MAX_MS]).
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TEMPERATURE = 0.0;
const DEFAULT_MAX_TOKENS = 1024;
const HEALTH_PROBE_TIMEOUT_MS = 1500;
const TIMEOUT_MIN_MS = 500;
const TIMEOUT_MAX_MS = 60_000;
const TEMP_MIN = 0;
const TEMP_MAX = 1;
const TOKENS_MIN = 32;
const TOKENS_MAX = 8192;

const SYSTEM_PROMPTS: Record<NVIDIACAMTaskKind, string> = {
  strategy_recommend:
    "You are a senior CAM programmer. Given a part description and machine context, output JSON with keys 'strategy' (string), 'rationale' (string), 'alternates' (array of strings), 'confidence' (0..1). No prose outside JSON.",
  parameter_extract:
    "You extract structured CAM parameters from free-text operation specifications. Output JSON: { parameters: { ... } } where each value is a primitive (string|number|boolean). No prose outside JSON.",
  operation_classify:
    "You classify CAM operation blocks. Output JSON with keys 'op_type' (string), 'family' (one of: roughing, finishing, drilling, threading, turning, edm, special), 'confidence' (0..1). No prose outside JSON.",
  tool_select_advisor:
    "You advise on tool selection for a single CAM feature. Output JSON with keys 'tool_family' (string), 'diameter_mm' (number), 'flutes' (integer), 'rationale' (string). No prose outside JSON.",
};

const fetchUnavailable: typeof fetch = (async (): Promise<Response> => {
  throw new Error("fetch not available in this runtime");
}) as typeof fetch;

/**
 * Module-level fetch reference — overridable by tests via setFetch().
 * Unit tests inject a deterministic fake; production uses globalThis.fetch.
 */
let _fetch: typeof fetch =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : fetchUnavailable;

export class NVIDIALLMCAMEngine {
  /**
   * Test-only: override the fetch implementation. Production code never
   * calls this; tests inject a deterministic mock. Resets via resetFetch().
   */
  static setFetch(fn: typeof fetch): void {
    _fetch = fn;
  }

  /** Test-only: restore globalThis.fetch as the transport. */
  static resetFetch(): void {
    _fetch =
      typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : fetchUnavailable;
  }

  /**
   * Run a CAM-domain inference task against an NVIDIA NIM/Triton endpoint.
   * @param task    The CAM task kind (chooses system prompt + schema).
   * @param prompt  The user-side prompt body.
   * @param opts    Endpoint/model/auth/timeout overrides.
   * @returns       Structured result envelope; never throws.
   */
  static async query<T = unknown>(
    task: NVIDIACAMTaskKind,
    prompt: string,
    opts: NVIDIAQueryOptions = {}
  ): Promise<NVIDIAQueryResult<T>> {
    const start = Date.now();
    const endpoint = resolveEndpoint(opts.endpoint);
    const model = opts.model ?? DEFAULT_MODEL;
    const timeoutMs = clamp(
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      TIMEOUT_MIN_MS,
      TIMEOUT_MAX_MS
    );
    const temperature = clamp(
      opts.temperature ?? DEFAULT_TEMPERATURE,
      TEMP_MIN,
      TEMP_MAX
    );
    const maxTokens = clamp(
      opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      TOKENS_MIN,
      TOKENS_MAX
    );
    const apiKey = opts.apiKey ?? process.env.NVIDIA_API_KEY;

    if (!task || !(task in SYSTEM_PROMPTS)) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "bad_input",
        error: `Unknown CAM task kind: ${String(task)}`,
      };
    }
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "bad_input",
        error: "prompt must be a non-empty string",
      };
    }

    // ── Build OpenAI-compatible /v1/chat/completions payload ────────────────
    const payload = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[task] },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      stream: false,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const url = endpoint.replace(/\/+$/, "") + "/v1/chat/completions";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await _fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const code = mapTransportError(err);
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: code,
        error: (err as Error).message,
      };
    }
    clearTimeout(timer);

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: apiKey ? "auth_failed" : "auth_required",
        error: `HTTP ${response.status}`,
      };
    }
    if (response.status === 404) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "model_not_found",
        error: `HTTP 404: ${model} not loaded at ${url}`,
      };
    }
    if (response.status === 429) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "rate_limited",
        error: "HTTP 429: rate limited",
      };
    }
    if (!response.ok) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "nvidia_unavailable",
        error: `HTTP ${response.status}`,
      };
    }

    let json: NVIDIAChatResponseShape;
    try {
      json = (await response.json()) as NVIDIAChatResponseShape;
    } catch (err) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "json_parse_failed",
        error: `outer JSON parse failed: ${(err as Error).message}`,
      };
    }

    const content = json?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "empty_response",
        error: "no content in choices[0].message",
      };
    }

    const objectText = extractFirstJsonObject(content) ?? content;
    let parsed: T;
    try {
      parsed = JSON.parse(objectText) as T;
    } catch (err) {
      return {
        success: false,
        task,
        parsed: null,
        raw: content,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "json_parse_failed",
        error: (err as Error).message,
      };
    }
    if (!validateForTask(task, parsed)) {
      return {
        success: false,
        task,
        parsed: null,
        raw: content,
        model,
        endpoint,
        latencyMs: Date.now() - start,
        errorCode: "schema_mismatch",
        error: `response did not satisfy ${task} schema`,
      };
    }

    const tokensPerSecond = computeTokensPerSecond(json);
    return {
      success: true,
      task,
      parsed,
      raw: content,
      model,
      endpoint,
      latencyMs: Date.now() - start,
      ...(tokensPerSecond !== undefined ? { tokensPerSecond } : {}),
    };
  }

  /** Convenience wrappers with full typing. */
  static async strategyRecommend(
    prompt: string,
    opts: NVIDIAQueryOptions = {}
  ): Promise<NVIDIAQueryResult<NVIDIAStrategyOutput>> {
    return this.query<NVIDIAStrategyOutput>("strategy_recommend", prompt, opts);
  }
  static async parameterExtract(
    prompt: string,
    opts: NVIDIAQueryOptions = {}
  ): Promise<NVIDIAQueryResult<NVIDIAParameterOutput>> {
    return this.query<NVIDIAParameterOutput>("parameter_extract", prompt, opts);
  }
  static async operationClassify(
    prompt: string,
    opts: NVIDIAQueryOptions = {}
  ): Promise<NVIDIAQueryResult<NVIDIAOperationClassifyOutput>> {
    return this.query<NVIDIAOperationClassifyOutput>(
      "operation_classify",
      prompt,
      opts
    );
  }
  static async toolSelectAdvisor(
    prompt: string,
    opts: NVIDIAQueryOptions = {}
  ): Promise<NVIDIAQueryResult<NVIDIAToolSelectOutput>> {
    return this.query<NVIDIAToolSelectOutput>(
      "tool_select_advisor",
      prompt,
      opts
    );
  }

  /**
   * Probe whether the NVIDIA endpoint is live. Never throws; on failure
   * returns available=false plus an errorCode the orchestrator uses to
   * route around this engine.
   */
  static async healthCheck(opts: {
    endpoint?: string;
    apiKey?: string;
    model?: string;
  } = {}): Promise<NVIDIAHealthResult> {
    const start = Date.now();
    const endpoint = resolveEndpoint(opts.endpoint);
    const model = opts.model ?? DEFAULT_MODEL;
    const apiKey = opts.apiKey ?? process.env.NVIDIA_API_KEY;
    const url = endpoint.replace(/\/+$/, "") + "/v1/models";

    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);

    try {
      const response = await _fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        return {
          available: false,
          endpoint,
          model,
          latencyMs: Date.now() - start,
          errorCode:
            response.status === 401 || response.status === 403
              ? apiKey
                ? "auth_failed"
                : "auth_required"
              : "nvidia_unavailable",
          error: `HTTP ${response.status}`,
        };
      }
      return {
        available: true,
        endpoint,
        model,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      clearTimeout(timer);
      return {
        available: false,
        endpoint,
        model,
        latencyMs: Date.now() - start,
        errorCode: mapTransportError(err),
        error: (err as Error).message,
      };
    }
  }

  /** Lists supported task kinds (for dispatcher discovery). */
  static listTasks(): NVIDIACAMTaskKind[] {
    return Object.keys(SYSTEM_PROMPTS) as NVIDIACAMTaskKind[];
  }

  /** Returns the resolved endpoint that would be used given options. */
  static resolveEndpoint(override?: string): string {
    return resolveEndpoint(override);
  }

  /** Returns the system prompt for a task (for explainability). */
  static getSystemPrompt(task: NVIDIACAMTaskKind): string {
    if (!(task in SYSTEM_PROMPTS)) {
      throw new Error(`Unknown CAM task kind: ${String(task)}`);
    }
    return SYSTEM_PROMPTS[task];
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

interface NVIDIAChatResponseShape {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { completion_tokens?: number; total_time_ms?: number };
}

function clamp(value: number, lo: number, hi: number): number {
  if (Number.isNaN(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

function resolveEndpoint(override?: string): string {
  if (override && override.trim().length > 0) return normalizeNimBase(override);
  const env =
    process.env.NVIDIA_NIM_ENDPOINT ||
    process.env.TRITON_HTTP_ENDPOINT ||
    process.env.NIM_URL ||
    "";
  if (env.trim().length > 0) return normalizeNimBase(env);
  return DEFAULT_ENDPOINT;
}

/**
 * Normalize an endpoint to a bare `scheme://host:port` base. query() and
 * healthCheck() append their own `/v1/chat/completions` and `/v1/models`
 * routes, so a trailing `/v1` segment (and any trailing slashes) must be
 * stripped first. This lets the PRISM-canonical `NIM_URL` — which is
 * `/v1`-suffixed (see local-llm-bridge.mjs + nim-autostart.mjs) — be consumed
 * directly without producing a doubled `/v1/v1/...` URL, and likewise
 * normalizes a `/v1`-suffixed explicit override.
 */
function normalizeNimBase(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (/\/v1$/i.test(u)) u = u.slice(0, -3).replace(/\/+$/, "");
  return u;
}

function mapTransportError(err: unknown): NVIDIAErrorCode {
  const m = ((err as Error)?.name + " " + (err as Error)?.message).toLowerCase();
  if (m.includes("aborterror") || m.includes("timeout") || m.includes("aborted"))
    return "nvidia_timeout";
  if (m.includes("econnrefused") || m.includes("fetch") || m.includes("network"))
    return "nvidia_unavailable";
  return "nvidia_unavailable";
}

function computeTokensPerSecond(json: NVIDIAChatResponseShape): number | undefined {
  const t = json?.usage?.completion_tokens;
  const ms = json?.usage?.total_time_ms;
  if (typeof t === "number" && typeof ms === "number" && ms > 0) {
    return Math.round((t / ms) * 1000);
  }
  return undefined;
}

function extractFirstJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const candidate = fenced?.[1] ?? raw;
  const start = candidate.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  return null;
}

function validateForTask(task: NVIDIACAMTaskKind, value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  switch (task) {
    case "strategy_recommend":
      return (
        typeof v.strategy === "string" &&
        typeof v.rationale === "string" &&
        Array.isArray(v.alternates) &&
        typeof v.confidence === "number"
      );
    case "parameter_extract":
      return typeof v.parameters === "object" && v.parameters !== null;
    case "operation_classify":
      return (
        typeof v.op_type === "string" &&
        typeof v.family === "string" &&
        typeof v.confidence === "number"
      );
    case "tool_select_advisor":
      return (
        typeof v.tool_family === "string" &&
        typeof v.diameter_mm === "number" &&
        typeof v.flutes === "number" &&
        typeof v.rationale === "string"
      );
  }
}
