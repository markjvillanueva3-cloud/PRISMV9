/**
 * openrouter-client.mjs -- OpenRouter cloud LLM client
 * (CLOUD-OVERFLOW-MS0/U-OPENROUTER-CLIENT, slot:alpha 2026-06-15).
 *
 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". After the
 * gpt-oss:120b vs local-87GB-nemo vs OpenRouter assessment, route long-context /
 * deep-research / free-overflow work to NVIDIA Nemotron-3 on OpenRouter (1M context,
 * $0 on the :free tier) instead of pulling the 87GB local quant that cannot use its
 * long-context edge locally (barely fits 96GB VRAM, no KV headroom, slower than
 * gpt-oss:120b).
 *
 * SHAPE: pure request/response shaping (exported, unit-tested) + a thin impure fetch
 * shell, mirroring ask-ollama.mjs's callOllama (R8 -- same fail-soft contract).
 *
 * FAIL-LOUD (R12): missing key / HTTP error / empty completion -> explicit reason in
 * `error`, never a faked success. The call NEVER throws -- every failure is a return value.
 *
 * EXTERNAL SERVICE NOTE: this POSTs prompt content to api.openrouter.ai, a third party.
 * Safety-critical (NC/G-code) and private content must be guarded by the CALLER before it
 * reaches here -- see ask-openrouter.mjs's looksLikeNcProgram refusal. Sending content to
 * an external service publishes it (may be logged/cached by the provider).
 *
 * Model slugs verified live against https://openrouter.ai/api/v1/models on 2026-06-15.
 */

/** OpenAI-compatible chat-completions endpoint. */
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * The cloud-model routing registry, verified live against
 * https://openrouter.ai/api/v1/models. Nemotron-3 verified 2026-06-15; GLM verified
 * 2026-06-17. Costs are USD per 1,000,000 tokens (prompt / completion). The :free tiers
 * are $0 but rate-limited by OpenRouter (roughly 20 req/min; ~50/day with <$10 account
 * credit, ~1000/day at >=$10). Default is super-free (the assessment-validated tier the
 * operator green-lit); ultra-free is a strictly-stronger one-env-var upgrade
 * (OPENROUTER_MODEL=nemotron-ultra-free); the paid slugs are pennies-per-1M fallbacks
 * when a free tier is rate-limited.
 *
 * Entries with `candidate: true` are NOT routing-active -- they are benchmark candidates
 * a chat A/B-tests against the default WITHOUT a code edit, because resolveModelSlug maps a
 * registry KEY -> its slug (so `OPENROUTER_MODEL=glm-5.2 node scripts/ask-openrouter.mjs
 * "<prompt>"` exercises the candidate live). A candidate is promoted to a routing rung in
 * model-routing-policy.mjs ONLY on assessment evidence -- never default quality/safety work
 * to an unproven model. GLM-5.2 (z-ai) is a frontier 1M-ctx model at ~$1.40/$4.40 per 1M
 * (premium -- same price tier as nemotron-ultra paid). No bare "GLM-5" exists; 5.2 is the
 * newest live GLM (5.1 is the prior, shorter-ctx variant).
 */
export const OPENROUTER_MODELS = Object.freeze({
  "nemotron-super-free": Object.freeze({ slug: "nvidia/nemotron-3-super-120b-a12b:free", ctx: 1000000, promptUsdPerM: 0, completionUsdPerM: 0, tier: "free" }),
  "nemotron-super":      Object.freeze({ slug: "nvidia/nemotron-3-super-120b-a12b",      ctx: 1000000, promptUsdPerM: 0.09, completionUsdPerM: 0.45, tier: "paid" }),
  "nemotron-ultra-free": Object.freeze({ slug: "nvidia/nemotron-3-ultra-550b-a55b:free", ctx: 1000000, promptUsdPerM: 0, completionUsdPerM: 0, tier: "free" }),
  "nemotron-ultra":      Object.freeze({ slug: "nvidia/nemotron-3-ultra-550b-a55b",      ctx: 1000000, promptUsdPerM: 0.50, completionUsdPerM: 2.50, tier: "paid" }),
  // -- benchmark candidates (NOT routing-active; A/B via OPENROUTER_MODEL=<key>) --
  "glm-5.2": Object.freeze({ slug: "z-ai/glm-5.2", ctx: 1048576, promptUsdPerM: 1.40, completionUsdPerM: 4.40, tier: "paid", candidate: true }),
  "glm-5.1": Object.freeze({ slug: "z-ai/glm-5.1", ctx: 202752,  promptUsdPerM: 0.98, completionUsdPerM: 3.08, tier: "paid", candidate: true }),
});

/** The default model slug -- super-free, the assessment-validated cloud tier. */
export const DEFAULT_MODEL_SLUG = OPENROUTER_MODELS["nemotron-super-free"].slug;

export const DEFAULT_TIMEOUT_MS = 180000;
export const MIN_TIMEOUT_MS = 1000;
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_TEMPERATURE = 0.3;
/** OpenRouter attribution headers (improve free-tier standing). */
export const DEFAULT_REFERER = "https://github.com/prism";
export const DEFAULT_TITLE = "PRISM";
/** Standard back-of-envelope chars-per-token ratio (shared with ask-ollama). */
const CHARS_PER_TOKEN = 4;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Resolve the model slug for a call. Precedence: explicit `override` -> env
 * OPENROUTER_MODEL -> DEFAULT_MODEL_SLUG. An override/env value that matches a
 * registry KEY (e.g. "nemotron-ultra-free") resolves to that key's slug; anything
 * else is treated as a raw slug verbatim (so a future slug works without a code edit).
 * Pure.
 */
export function resolveModelSlug(override, env = process.env) {
  const pick = (v) => {
    const s = String(v == null ? "" : v).trim();
    if (!s) return "";
    if (Object.prototype.hasOwnProperty.call(OPENROUTER_MODELS, s)) return OPENROUTER_MODELS[s].slug;
    return s;
  };
  return pick(override) || pick(env && env.OPENROUTER_MODEL) || DEFAULT_MODEL_SLUG;
}

/** Pure: the API key from env (OPENROUTER_API_KEY), or "" when unset. */
export function keyFromEnv(env = process.env) {
  return String((env && env.OPENROUTER_API_KEY) || "").trim();
}

/** Pure: key presence + a human source label. { present, source }. */
export function keyStatus(env = process.env) {
  const k = keyFromEnv(env);
  return { present: !!k, source: k ? "OPENROUTER_API_KEY" : "(unset)" };
}

/**
 * Pure: mask any OpenRouter/OpenAI-style secret in a string so it never lands in a
 * log/ledger/error. Matches sk-or-..., sk-..., and a bare long token after "Bearer ".
 */
export function redactKey(s) {
  return String(s == null ? "" : s)
    // Bearer rule FIRST: a "Bearer <token>" fully masks to "Bearer ***" (cleanest --
    // no key namespace leaks). Then the bare sk-/sk-or- rules catch any non-Bearer
    // occurrence elsewhere in the string. ALL rules are case-insensitive: redactKey is
    // the last-line guard on untrusted provider-controlled strings (an HTTP body / error
    // object the provider may upcase or reformat), so a cased token must still mask.
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{8,}/gi, "$1***")
    .replace(/sk-or-[A-Za-z0-9._-]+/gi, "sk-or-***")
    .replace(/sk-[A-Za-z0-9._-]{8,}/gi, "sk-***");
}

/**
 * Pure: defense-in-depth scrub for a string that may contain a KNOWN secret. Runs
 * redactKey (pattern masking) AND literal-replaces the exact `secret` value, so a key
 * in an unexpected shape (raw token, no sk- prefix) is still removed when the caller
 * knows it. A too-short/empty secret is ignored (never replace "" -> mangling). Used by
 * the shell on every error string that could echo provider-controlled or request bytes.
 */
export function scrubSecret(s, secret) {
  let out = redactKey(s);
  const k = String(secret == null ? "" : secret).trim();
  if (k.length >= 8) out = out.split(k).join("***");
  return out;
}

/**
 * Pure: build the request headers. Authorization is required; HTTP-Referer + X-Title are
 * OpenRouter's optional attribution headers (improve free-tier standing). Throws nothing.
 */
export function buildHeaders({ apiKey, referer = DEFAULT_REFERER, title = DEFAULT_TITLE } = {}) {
  const h = { "Content-Type": "application/json" };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  if (referer) h["HTTP-Referer"] = referer;
  if (title) h["X-Title"] = title;
  return h;
}

/**
 * Pure: build the chat-completions request body. Validates `messages` is a non-empty
 * array of {role, content}. Returns { ok, body } | { ok:false, error }.
 */
export function buildChatBody({ messages, model, maxTokens = DEFAULT_MAX_TOKENS, temperature = DEFAULT_TEMPERATURE } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array" };
  }
  for (const m of messages) {
    if (!m || typeof m.role !== "string" || typeof m.content !== "string" || !m.content.trim()) {
      return { ok: false, error: "every message needs a string role and non-empty string content" };
    }
  }
  const mt = Number(maxTokens);
  const temp = Number(temperature);
  return {
    ok: true,
    body: {
      model: String(model || DEFAULT_MODEL_SLUG),
      messages,
      max_tokens: Number.isFinite(mt) && mt > 0 ? Math.floor(mt) : DEFAULT_MAX_TOKENS,
      temperature: Number.isFinite(temp) && temp >= 0 ? temp : DEFAULT_TEMPERATURE,
      stream: false,
    },
  };
}

/** Pure: a system+user message pair. A blank system is omitted. */
export function buildMessages({ system = "", user = "" } = {}) {
  const msgs = [];
  if (system && String(system).trim()) msgs.push({ role: "system", content: String(system) });
  if (user && String(user).trim()) msgs.push({ role: "user", content: String(user) });
  return msgs;
}

/**
 * Pure: extract the completion from an OpenAI-compatible response object. Returns
 * { ok, text, usage, finishReason } | { ok:false, error }. Handles a provider error
 * object, a missing/empty choices array, and an empty message content.
 */
export function extractCompletion(json) {
  if (!json || typeof json !== "object") return { ok: false, error: "response was not a JSON object" };
  if (json.error) {
    const e = json.error;
    const msg = typeof e === "string" ? e : (e && e.message) || JSON.stringify(e);
    return { ok: false, error: `OpenRouter error: ${redactKey(String(msg)).slice(0, 300)}` };
  }
  const choices = Array.isArray(json.choices) ? json.choices : null;
  if (!choices || choices.length === 0) return { ok: false, error: "response had no choices" };
  const c0 = choices[0] || {};
  const msg = c0.message || {};
  const text = String(msg.content == null ? "" : msg.content).trim();
  if (!text) {
    const fr = c0.finish_reason || "";
    return { ok: false, error: `empty completion${fr ? ` (finish_reason=${fr})` : ""}` };
  }
  return { ok: true, text, usage: json.usage || null, finishReason: c0.finish_reason || null };
}

/** Pure: rough token estimate (4 chars/token). */
export function estimateTokens(s) {
  return Math.ceil(String(s == null ? "" : s).length / CHARS_PER_TOKEN);
}

/**
 * Pure: USD cost for a usage object given a model key (or slug). Returns 0 for free
 * tiers and when usage/pricing is unavailable. usage = { prompt_tokens, completion_tokens }.
 */
export function costFor(usage, modelKeyOrSlug) {
  if (!usage || typeof usage !== "object") return 0;
  let m = OPENROUTER_MODELS[modelKeyOrSlug];
  if (!m) m = Object.values(OPENROUTER_MODELS).find((x) => x.slug === modelKeyOrSlug);
  if (!m) return 0;
  const pt = Number(usage.prompt_tokens) || 0;
  const ct = Number(usage.completion_tokens) || 0;
  return (pt / 1e6) * m.promptUsdPerM + (ct / 1e6) * m.completionUsdPerM;
}

/** Pure: one-line honest footer -- cloud tokens used + cost. */
export function cloudFooter({ model, usage, durationMs } = {}) {
  const inTok = usage ? (Number(usage.prompt_tokens) || 0) : 0;
  const outTok = usage ? (Number(usage.completion_tokens) || 0) : 0;
  const cost = costFor(usage, model);
  const costStr = cost > 0 ? `$${cost.toFixed(6)}` : "$0 (free tier)";
  const dur = durationMs ? `, ${Math.round(durationMs)}ms` : "";
  return `cloud(openrouter ${model}): ${inTok} prompt + ${outTok} completion tok, ${costStr}${dur} -- 0 tokens entered the Claude context`;
}

// ---------------------------------------------------------------------------
// Impure shell (fetch injected so the pure path stays unit-testable)
// ---------------------------------------------------------------------------

/**
 * POST one non-streaming chat completion to OpenRouter. Returns
 * { ok, text, usage, finishReason, model, durationMs } | { ok:false, error, model }.
 * NEVER throws. Missing key -> explicit fail-loud error (no faked success). The wall
 * clock is taken from an injectable `now` so the duration path is testable.
 */
export async function callOpenRouter(opts = {}) {
  const {
    messages,
    model: modelArg = DEFAULT_MODEL_SLUG,
    apiKey = keyFromEnv(),
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    url = OPENROUTER_URL,
    fetchImpl = fetch,
    now = () => Date.now(),
    referer,
    title,
  } = opts;
  // Resolve a registry KEY (e.g. "nemotron-ultra-free") to its real slug here so a
  // caller that passes a key never 400s with a bogus model id (a raw slug passes through).
  const model = resolveModelSlug(modelArg);
  // Every error string is scrubbed of the in-scope key (pattern + literal) before return.
  const scrub = (s) => scrubSecret(s, apiKey);

  if (!apiKey) {
    return {
      ok: false,
      model,
      error:
        "OPENROUTER_API_KEY not set -- the cloud route is inert. Set it once: " +
        "setx OPENROUTER_API_KEY \"sk-or-...\" (new shells), then retry. Get a key at https://openrouter.ai/keys",
    };
  }
  const built = buildChatBody({ messages, model, maxTokens, temperature });
  if (!built.ok) return { ok: false, model, error: built.error };

  const ctrl = new AbortController();
  const to = Math.max(MIN_TIMEOUT_MS, Number(timeoutMs) || DEFAULT_TIMEOUT_MS);
  const timer = setTimeout(() => ctrl.abort(), to);
  const t0 = now();
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: buildHeaders({ apiKey, referer, title }),
      body: JSON.stringify(built.body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, model, error: `OpenRouter HTTP ${res.status}: ${scrub(String(body)).slice(0, 300)}` };
    }
    let json;
    try {
      json = await res.json();
    } catch (e) {
      return { ok: false, model, error: `OpenRouter response was not valid JSON: ${scrub(e && e.message ? e.message : String(e))}` };
    }
    const parsed = extractCompletion(json);
    // scrub the in-scope key too: extractCompletion only pattern-redacts a provider error
    // (it is pure, has no key); a raw/unexpected-shape key echoed in a 200 error body would
    // slip the pattern. scrub() literal-removes the known key (3-of-3 arm-C P1 fix 2026-06-15).
    if (!parsed.ok) return { ok: false, model, error: scrub(parsed.error) };
    return { ok: true, text: parsed.text, usage: parsed.usage, finishReason: parsed.finishReason, model, durationMs: now() - t0 };
  } catch (e) {
    const why =
      e && e.name === "AbortError"
        ? `OpenRouter timed out after ${to}ms (cloud free tier can queue under load -- retry, or use a paid slug via OPENROUTER_MODEL=nemotron-super)`
        : `OpenRouter unreachable: ${scrub(e && e.message ? e.message : String(e))}`;
    return { ok: false, model, error: why };
  } finally {
    clearTimeout(timer);
  }
}
