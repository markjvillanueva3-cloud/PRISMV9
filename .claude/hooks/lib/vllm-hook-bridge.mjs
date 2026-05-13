// tier: T4
/**
 * vllm-hook-bridge.mjs - vLLM HTTP client (OpenAI-compatible)
 *
 * Same surface as nim-hook-bridge.mjs / ollama-hook-bridge.mjs so the
 * higher-level local-llm-bridge.mjs can fan out to all three transparently.
 *
 * vLLM is used for non-NIM models — DeepSeek-R1-Distill family, Qwen2.5-Coder
 * larger sizes, etc. Default port 8020 to avoid collisions with NIM (8000-8010).
 *
 * EXPORTS
 *   isVllmAvailable() -> Promise<boolean>          (60s cached)
 *   queryVllm(prompt, opts) -> { success, response, error, latencyMs }
 *
 * CONFIG (env)
 *   VLLM_URL          default http://127.0.0.1:8020/v1
 *   VLLM_HOOK_MODEL   default local-vllm  (compose served-model-name)
 *   VLLM_TIMEOUT_MS   default 30000  (vLLM cold start can be slow)
 */

const VLLM_URL = (process.env.VLLM_URL || "http://127.0.0.1:8020/v1").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.VLLM_HOOK_MODEL || "local-vllm";
const DEFAULT_TIMEOUT = parseInt(process.env.VLLM_TIMEOUT_MS || "30000", 10);

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

let availCache = { ok: null, ts: 0 };
const AVAIL_TTL_MS = 60_000;
const AVAIL_PROBE_TIMEOUT_MS = 1500;

export async function isVllmAvailable() {
  const now = Date.now();
  if (availCache.ok !== null && now - availCache.ts < AVAIL_TTL_MS) return availCache.ok;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), AVAIL_PROBE_TIMEOUT_MS);
  let ok = false;
  try {
    const r = await fetch(`${VLLM_URL}/models`, { signal: ctl.signal });
    ok = r.ok;
  } catch { /* unreachable */ }
  finally { clearTimeout(t); }
  availCache = { ok, ts: now };
  return ok;
}

export function resetVllmAvailabilityCache() {
  availCache = { ok: null, ts: 0 };
}

export async function queryVllm(prompt, opts = {}) {
  const started = Date.now();
  const hookType = opts.hookType || "default";
  const model = opts.model || DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxTokens = opts.maxTokens ?? 256;
  const systemPrompt = opts.systemPrompt ?? HOOK_PROMPTS[hookType] ?? HOOK_PROMPTS.default;

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
    const r = await fetch(`${VLLM_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await r.text();
    if (!r.ok) {
      return {
        success: false,
        error: `vllm http ${r.status} ${text.slice(0, 200)}`,
        latencyMs: Date.now() - started,
        backend: "vllm",
      };
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content ?? "";
    return {
      success: true,
      response: content,
      latencyMs: Date.now() - started,
      backend: "vllm",
      model,
    };
  } catch (e) {
    return {
      success: false,
      error: e?.name === "AbortError" ? "timeout" : (e?.message || String(e)),
      latencyMs: Date.now() - started,
      backend: "vllm",
    };
  } finally {
    clearTimeout(t);
  }
}
