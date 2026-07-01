/**
 * OllamaCAMIntegrationEngine — CAM-EXHAUST-MS0/U-CAM112
 *
 * Local-LLM inference adapter for CAM-domain queries. Thin wrapper over the
 * existing PRISM Ollama infrastructure (OllamaHookBridgeEngine,
 * OllamaContextFloorEngine) that adds CAM-specific prompt templates,
 * deterministic JSON output enforcement, and graceful degradation when
 * the local Ollama daemon is unreachable.
 *
 * Used by the CAMDeepLearningOrchestratorEngine (U-CAM117) as one of the
 * inference paths in the multi-source AGI decision pipeline.
 *
 * CAM tasks supported:
 *   - strategy_recommend  → "given part features + machine, recommend strategy"
 *   - parameter_extract   → "extract structured params from a free-text op spec"
 *   - operation_classify  → "classify a CAM operation block by op-type"
 *   - tool_select_advisor → "advise tool family + diameter for a feature"
 *
 * Determinism: temperature defaults to 0.0 for CAM (production safety
 * outranks creativity); JSON-mode enforced for all four task types.
 *
 * Token economy: every successful local call saves ≥1 Claude turn.
 *
 * Dependencies:
 *   - OllamaHookBridgeEngine — base HTTP client + timeout/fallback
 *   - OllamaContextFloorEngine — system prompt = canonical PRISM brief
 *
 * Reference: PRISM Ollama Phase-1 doc + CAM-EXHAUST-MS0 unit U-CAM112.
 */

export type CAMTaskKind =
  | "strategy_recommend"
  | "parameter_extract"
  | "operation_classify"
  | "tool_select_advisor";

export interface CAMQueryOptions {
  /** Override default model. Default: qwen2.5-coder:32b. */
  model?: string;
  /** Override timeout. Default: 8000ms (CAM tasks tolerate longer than hooks). */
  timeoutMs?: number;
  /** Override temperature. Default 0.0 for deterministic CAM output. */
  temperature?: number;
  /** Override max tokens. Default 800 — large enough for structured JSON. */
  maxTokens?: number;
}

export interface CAMQueryResult<T = unknown> {
  success: boolean;
  task: CAMTaskKind;
  parsed: T | null;
  raw: string | null;
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
  errorCode?: CAMErrorCode;
  error?: string;
}

export type CAMErrorCode =
  | "ollama_unavailable"
  | "ollama_timeout"
  | "empty_response"
  | "json_parse_failed"
  | "schema_mismatch"
  | "bad_input";

export interface StrategyRecommendOutput {
  strategy: string;
  rationale: string;
  alternates: string[];
  confidence: number;
}

export interface ParameterExtractOutput {
  parameters: Record<string, string | number | boolean>;
}

export interface OperationClassifyOutput {
  op_type: string;
  family: string;
  confidence: number;
}

export interface ToolSelectOutput {
  tool_family: string;
  diameter_mm: number;
  flutes: number;
  rationale: string;
}

// ── Bounds and constants ────────────────────────────────────────────────────
const DEFAULT_MODEL = "qwen2.5-coder:32b";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_TEMPERATURE = 0.0;
const DEFAULT_MAX_TOKENS = 800;
const TIMEOUT_MIN_MS = 500;
const TIMEOUT_MAX_MS = 60_000;
const TEMP_MIN = 0;
const TEMP_MAX = 1;
const TOKENS_MIN = 32;
const TOKENS_MAX = 4096;

const SYSTEM_PROMPTS: Record<CAMTaskKind, string> = {
  strategy_recommend:
    "You are a senior CAM programmer. Given a part description and machine context, output JSON with keys 'strategy' (string), 'rationale' (string), 'alternates' (array of strings), 'confidence' (0..1). No prose outside JSON.",
  parameter_extract:
    "You extract structured CAM parameters from free-text operation specifications. Output JSON: { parameters: { ... } } where each value is a primitive (string|number|boolean). No prose outside JSON.",
  operation_classify:
    "You classify CAM operation blocks. Output JSON with keys 'op_type' (string), 'family' (one of: roughing, finishing, drilling, threading, turning, edm, special), 'confidence' (0..1). No prose outside JSON.",
  tool_select_advisor:
    "You advise on tool selection for a single CAM feature. Output JSON with keys 'tool_family' (string), 'diameter_mm' (number), 'flutes' (integer), 'rationale' (string). No prose outside JSON.",
};

export class OllamaCAMIntegrationEngine {
  /**
   * Run a CAM-domain inference task against local Ollama.
   *
   * @param task    The CAM task kind (chooses system prompt + schema).
   * @param prompt  The user-side prompt body — the actual question/payload.
   * @param opts    Query overrides (model, timeout, temperature, maxTokens).
   * @returns       Structured result envelope including parsed JSON or null.
   * @throws        Never. All failures surface via `success=false` + errorCode.
   */
  static async query<T = unknown>(
    task: CAMTaskKind,
    prompt: string,
    opts: CAMQueryOptions = {}
  ): Promise<CAMQueryResult<T>> {
    const start = Date.now();
    const model = opts.model ?? DEFAULT_MODEL;

    // ── Bounds-checked option resolution ────────────────────────────────────
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

    // ── Input validation ────────────────────────────────────────────────────
    if (!task || !(task in SYSTEM_PROMPTS)) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        latencyMs: Date.now() - start,
        fallbackUsed: false,
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
        latencyMs: Date.now() - start,
        fallbackUsed: false,
        errorCode: "bad_input",
        error: "prompt must be a non-empty string",
      };
    }

    const systemPrompt = SYSTEM_PROMPTS[task];

    // ── Delegate to OllamaHookBridge for resilient transport ────────────────
    let raw: string | null = null;
    let fallbackUsed = false;
    let transportError: string | undefined;
    try {
      const { ollamaHookBridgeEngine } = await import(
        "./OllamaHookBridgeEngine.js"
      );
      const result = await ollamaHookBridgeEngine.query(prompt, {
        hookType: "general",
        systemPrompt,
        timeoutMs,
        maxTokens,
        temperature,
      });
      raw = result.response;
      fallbackUsed = result.fallbackUsed;
      transportError = result.error;
      if (!result.success) {
        const code = mapTransportError(result.error);
        return {
          success: false,
          task,
          parsed: null,
          raw: null,
          model: result.model || model,
          latencyMs: Date.now() - start,
          fallbackUsed: result.fallbackUsed,
          errorCode: code,
          error: result.error || "ollama transport failure",
        };
      }
    } catch (err) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        latencyMs: Date.now() - start,
        fallbackUsed: true,
        errorCode: "ollama_unavailable",
        error: (err as Error).message,
      };
    }

    if (!raw || raw.trim().length === 0) {
      return {
        success: false,
        task,
        parsed: null,
        raw: null,
        model,
        latencyMs: Date.now() - start,
        fallbackUsed,
        errorCode: "empty_response",
        error: transportError ?? "ollama returned empty body",
      };
    }

    // ── Parse JSON envelope ─────────────────────────────────────────────────
    const json = extractFirstJsonObject(raw);
    if (!json) {
      return {
        success: false,
        task,
        parsed: null,
        raw,
        model,
        latencyMs: Date.now() - start,
        fallbackUsed,
        errorCode: "json_parse_failed",
        error: "no JSON object found in response",
      };
    }

    let parsed: T;
    try {
      parsed = JSON.parse(json) as T;
    } catch (err) {
      return {
        success: false,
        task,
        parsed: null,
        raw,
        model,
        latencyMs: Date.now() - start,
        fallbackUsed,
        errorCode: "json_parse_failed",
        error: (err as Error).message,
      };
    }

    if (!validateForTask(task, parsed)) {
      return {
        success: false,
        task,
        parsed: null,
        raw,
        model,
        latencyMs: Date.now() - start,
        fallbackUsed,
        errorCode: "schema_mismatch",
        error: `response did not satisfy ${task} schema`,
      };
    }

    return {
      success: true,
      task,
      parsed,
      raw,
      model,
      latencyMs: Date.now() - start,
      fallbackUsed,
    };
  }

  /** Convenience wrapper for strategy_recommend with full typing. */
  static async strategyRecommend(
    prompt: string,
    opts: CAMQueryOptions = {}
  ): Promise<CAMQueryResult<StrategyRecommendOutput>> {
    return this.query<StrategyRecommendOutput>("strategy_recommend", prompt, opts);
  }

  /** Convenience wrapper for parameter_extract with full typing. */
  static async parameterExtract(
    prompt: string,
    opts: CAMQueryOptions = {}
  ): Promise<CAMQueryResult<ParameterExtractOutput>> {
    return this.query<ParameterExtractOutput>("parameter_extract", prompt, opts);
  }

  /** Convenience wrapper for operation_classify with full typing. */
  static async operationClassify(
    prompt: string,
    opts: CAMQueryOptions = {}
  ): Promise<CAMQueryResult<OperationClassifyOutput>> {
    return this.query<OperationClassifyOutput>("operation_classify", prompt, opts);
  }

  /** Convenience wrapper for tool_select_advisor with full typing. */
  static async toolSelectAdvisor(
    prompt: string,
    opts: CAMQueryOptions = {}
  ): Promise<CAMQueryResult<ToolSelectOutput>> {
    return this.query<ToolSelectOutput>("tool_select_advisor", prompt, opts);
  }

  /**
   * Probe local Ollama availability. Returns availability + model list,
   * never throws.
   */
  static async healthCheck(): Promise<{
    available: boolean;
    baseUrl: string;
    models: string[];
    defaultModel: string;
    error?: string;
  }> {
    try {
      const { ollamaHookBridgeEngine } = await import(
        "./OllamaHookBridgeEngine.js"
      );
      const status = await ollamaHookBridgeEngine.status();
      return {
        available: status.available,
        baseUrl: status.baseUrl,
        models: status.models,
        defaultModel: status.defaultModel,
        ...(status.error ? { error: status.error } : {}),
      };
    } catch (err) {
      return {
        available: false,
        baseUrl: "http://localhost:11434",
        models: [],
        defaultModel: DEFAULT_MODEL,
        error: (err as Error).message,
      };
    }
  }

  /** Returns the list of supported CAM task kinds (for dispatcher discovery). */
  static listTasks(): CAMTaskKind[] {
    return Object.keys(SYSTEM_PROMPTS) as CAMTaskKind[];
  }

  /** Returns the system prompt for a given task (for explainability). */
  static getSystemPrompt(task: CAMTaskKind): string {
    if (!(task in SYSTEM_PROMPTS)) {
      throw new Error(`Unknown CAM task kind: ${String(task)}`);
    }
    return SYSTEM_PROMPTS[task];
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

function clamp(value: number, lo: number, hi: number): number {
  // NaN: no signal → fall back to lower bound (safest default).
  // ±Infinity: explicit "as large/small as possible" → let Math.max/min
  // resolve to the appropriate bound.
  if (Number.isNaN(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

function mapTransportError(message?: string): CAMErrorCode {
  const m = (message || "").toLowerCase();
  if (m.includes("timeout") || m.includes("aborted")) return "ollama_timeout";
  if (m.includes("econnrefused") || m.includes("fetch") || m.includes("not running"))
    return "ollama_unavailable";
  return "ollama_unavailable";
}

/**
 * Extract the first balanced JSON object from a raw model response.
 * Handles models that wrap JSON in prose, code fences, or multi-block output.
 * Returns null if no balanced object found.
 */
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
      if (depth === 0) {
        return candidate.slice(start, i + 1);
      }
    }
  }
  return null;
}

function validateForTask(task: CAMTaskKind, value: unknown): boolean {
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
