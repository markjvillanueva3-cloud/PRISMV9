// tier: T4
/**
 * nim-hook-bridge.mjs — NVIDIA NIM HTTP client
 *
 * Mirrors the public API of `ollama-hook-bridge.mjs` so callers can swap
 * imports with no other code change. Where Ollama uses `/api/generate`,
 * NIM uses OpenAI-compatible `/v1/chat/completions`.
 *
 * EXPORTS
 *   isNimAvailable() -> Promise<boolean>          (1-min cached)
 *   queryNim(prompt, opts) -> { success, response, error, latencyMs }
 *
 * CONFIG (env)
 *   NIM_URL          default http://127.0.0.1:8000/v1
 *   NIM_HOOK_MODEL   default meta/llama-3.1-8b-instruct
 *   NIM_TIMEOUT_MS   default 8000  (NIM is faster than Ollama; allow longer
 *                                   on cold start though — first call after
 *                                   container boot may take 30s)
 *
 * Per-hook model map mirrors Ollama's HOOK_MODELS pattern.
 */

const NIM_URL = (process.env.NIM_URL || "http://127.0.0.1:8000/v1").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.NIM_HOOK_MODEL || "meta/llama-3.1-8b-instruct";
const DEFAULT_TIMEOUT = parseInt(process.env.NIM_TIMEOUT_MS || "8000", 10);

// Per-hook model selection. Codestral is only present on RTX 4080 hosts;
// queryNim() auto-falls-back to DEFAULT_MODEL on 404 from the larger model
// so callers never need to know which GPU they're on.
const HOOK_MODELS = {
  docstring:   "meta/llama-3.1-8b-instruct",
  classify:    "meta/llama-3.1-8b-instruct",
  summarize:   "meta/llama-3.1-8b-instruct",
  lint:        "meta/llama-3.1-8b-instruct",
  diffsummary: "meta/llama-3.1-8b-instruct",
  errortriage: "meta/llama-3.1-8b-instruct",
  reasoning:   "mistralai/codestral-22b-v0.1",
  code:        "mistralai/codestral-22b-v0.1",
  default:     DEFAULT_MODEL,
};

const HOOK_PROMPTS = {
  docstring:   "You write concise JSDoc / TSDoc. Return ONLY the docstring block, no surrounding code.",
  classify:    "You classify text into a single category. Return ONLY the category label.",
  summarize:   "You summarize. Return ONLY the summary, no preamble.",
  lint:        "You spot bugs. Return ONLY a bullet list of issues, or 'OK' if clean.",
  diffsummary: "You summarize git diffs in one short paragraph. Return ONLY the summary.",
  errortriage: "You triage errors. Return ONLY: root cause + 1-line fix.",
  reasoning:   "You are a careful reasoner. Show terse step-by-step then final answer.",
  code:        "You write production code. Return ONLY the requested code, no commentary.",
  default:     "",
};

// Availability cache (60s)
let availCache = { ok: null, ts: 0 };
const AVAIL_TTL_MS = 60_000;
const AVAIL_PROBE_TIMEOUT_MS = 1500;

/**
 * Is a NIM endpoint reachable?
 * Cached for 60s to avoid hammering the endpoint on every hook fire.
 */
export async function isNimAvailable() {
  const now = Date.now();
  if (availCache.ok !== null && now - availCache.ts < AVAIL_TTL_MS) return availCache.ok;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), AVAIL_PROBE_TIMEOUT_MS);
  let ok = false;
  try {
    const r = await fetch(`${NIM_URL}/models`, { signal: ctl.signal });
    ok = r.ok;
  } catch { /* unreachable */ }
  finally { clearTimeout(t); }
  availCache = { ok, ts: now };
  return ok;
}

/**
 * Reset the availability cache. Call after starting/stopping NIM so
 * callers don't wait the full TTL.
 */
export function resetNimAvailabilityCache() {
  availCache = { ok: null, ts: 0 };
}

/**
 * Send a single-turn prompt to NIM and return the model's response.
 * Returns the same shape as `queryOllama` so callers don't branch.
 *
 * On 404 (model unknown to this NIM instance — e.g. asking 3080 for
 * Codestral) we transparently retry with DEFAULT_MODEL once, then give
 * up. This makes the bridge "just work" across heterogeneous hosts.
 */
export async function queryNim(prompt, opts = {}) {
  const started = Date.now();
  const hookType = opts.hookType || "default";
  const requestedModel = opts.model || HOOK_MODELS[hookType] || HOOK_MODELS.default;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxTokens = opts.maxTokens ?? 256;
  const systemPrompt = opts.systemPrompt ?? HOOK_PROMPTS[hookType] ?? HOOK_PROMPTS.default;

  const tryOnce = async (model) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const body = {
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: opts.temperature ?? 0.2,
        stream: false,
      };
      const r = await fetch(`${NIM_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      const text = await r.text();
      if (!r.ok) return { _httpStatus: r.status, _bodySnippet: text.slice(0, 200) };
      const data = JSON.parse(text);
      const content = data?.choices?.[0]?.message?.content ?? "";
      return { ok: true, content };
    } catch (e) {
      return { ok: false, error: e?.name === "AbortError" ? "timeout" : (e?.message || String(e)) };
    } finally {
      clearTimeout(t);
    }
  };

  let res = await tryOnce(requestedModel);

  // Auto-fallback: requested model isn't loaded on this host (typical when
  // 3080 host gets a Codestral request). Retry with the smaller default.
  if (res?._httpStatus === 404 && requestedModel !== DEFAULT_MODEL) {
    res = await tryOnce(DEFAULT_MODEL);
  }

  const latencyMs = Date.now() - started;
  if (res?.ok) {
    return { success: true, response: res.content, latencyMs, backend: "nim", model: res.modelUsed || requestedModel };
  }
  return {
    success: false,
    error: res?.error || `nim http ${res?._httpStatus} ${res?._bodySnippet || ""}`,
    latencyMs,
    backend: "nim",
  };
}
