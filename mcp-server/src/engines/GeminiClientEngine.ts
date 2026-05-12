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

    if (apiKey.length === 0) {
      return {
        ok: false,
        model,
        answer: "",
        latencyMs: 0,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        error: "GEMINI_API_KEY (or GOOGLE_API_KEY) env var not set — get a free key at https://aistudio.google.com/app/apikey",
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
