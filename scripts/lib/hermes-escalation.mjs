/**
 * hermes-escalation.mjs -- resolve an OPT-IN escalation target for Hermes (HERMES-ESCALATION-LADDER-MS0,
 * slot:bravo 2026-06-30). Pure resolution layer; execution lives in prism-mcp-for-hermes.mjs (prism_escalate).
 *
 * WHY (the design that keeps reliability while adding a frontier brain):
 *   Hermes runs LOCAL-FIRST -- gpt-oss:120b on the Blackwell, free + reliable, its authoritative agent
 *   model. For the ~10-20% of tasks beyond local capacity it calls `prism_escalate({tier, prompt})`, a
 *   ONE-SHOT tool (question -> answer -> text). This is deliberately NOT Hermes's native model/fallback
 *   path: that path is exactly what broke the desktop ("works 1/10") --
 *     (a) a cloud model served <64K HARD-FAILS Hermes's launch (the meta/llama-3.3-70b@32K crash), and
 *     (b) a <think> reasoning model as the AGENT model HANGS the agent loop (the "nemo3" recurrence).
 *   A tool call has neither failure mode: it returns text, so it can never hard-fail a launch or hang the
 *   loop. The 64K floor + reasoning-hang are therefore IRRELEVANT to tool-mode. We still PREFER non-reasoning
 *   instruct models for clean output, but the reliability guarantee no longer depends on it.
 *
 * Three tiers (all opt-in; local is the default and lives in the Hermes config, not here):
 *   - claude   : Claude Opus 4.8 via the operator's Claude Max SUBSCRIPTION (claude.exe -p). $0 marginal.
 *   - nvidia   : a vetted NVIDIA NIM instruct model (NVIDIA_API_KEY). Cheap cloud burst; REAL model ids
 *                (enumerated live from integrate.api.nvidia.com/v1/models on 2026-06-30 -- NOT fabricated).
 *   - frontier : a configured frontier API (anthropic | openai | gemini), key read from env. Operator wires
 *                the provider + sets the env key; this module never sees or logs the key value.
 *
 * Exports are pure + unit-tested. resolveEscalationTarget() NEVER throws -- it returns an {error} object so a
 * missing key / bad tier degrades gracefully instead of crashing the MCP facade (R12 fail-loud, not fail-hard).
 */

// Claude Opus 4.8 -- the plain id. The "[1m]" 1M-context suffix BREAKS the headless claude.cmd path
// (documented in prism-mcp-for-hermes buildClaudeArgv), so escalation uses the bare id.
export const CLAUDE_MODEL = process.env.PRISM_HERMES_CLAUDE_MODEL || "claude-opus-4-8";

// Codex tier: GPT-5.x via the operator's ChatGPT SUBSCRIPTION (Codex CLI OAuth in ~/.codex/auth.json),
// NOT an API key -> $0 pay-per-token. With ChatGPT-account auth Codex picks the model the account allows
// (config.toml default gpt-5.5), so this id is INFORMATIONAL only -- the facade does not force it with -m.
export const CODEX_MODEL = process.env.PRISM_HERMES_CODEX_MODEL || "gpt-5.5";

// NVIDIA opt-in tier. Default = qwen3-next-80b-a3b-instruct: an 80B MoE (~3B active = fast + cheap), 262K
// native context, NON-reasoning instruct -- confirmed present in the live /v1/models list (2026-06-30).
// Override with PRISM_HERMES_NVIDIA_MODEL; the "heavy" alias maps to the largest vetted instruct model.
export const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
export const NVIDIA_DEFAULT_MODEL = process.env.PRISM_HERMES_NVIDIA_MODEL || "qwen/qwen3-next-80b-a3b-instruct";
// Vetted NON-reasoning instruct models confirmed live on NVIDIA NIM (2026-06-30). Aliases -> real ids.
export const NVIDIA_MODELS = {
  default: "qwen/qwen3-next-80b-a3b-instruct",     // fast MoE, 262K ctx
  fast:    "qwen/qwen3-next-80b-a3b-instruct",
  heavy:   "mistralai/mistral-large-3-675b-instruct-2512", // 675B dense-ish, top open quality
  llama4:  "meta/llama-4-maverick-17b-128e-instruct",      // Llama 4 Maverick MoE, very long ctx
  nemotron:"nvidia/llama-3.1-nemotron-70b-instruct",       // the INSTRUCT nemotron (not a reasoner)
};

// Frontier provider registry. endpoint + default model + the ENV VAR that holds the key + wire protocol.
// Models are the latest per Anthropic/OpenAI/Google as of 2026-06; override per-provider via env.
export const FRONTIER_PROVIDERS = {
  anthropic: {
    wire: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: process.env.PRISM_HERMES_ANTHROPIC_MODEL || "claude-sonnet-5",
    keyEnv: "ANTHROPIC_API_KEY",
    headerName: "x-api-key",
    extraHeaders: { "anthropic-version": "2023-06-01" },
  },
  openai: {
    wire: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: process.env.PRISM_HERMES_OPENAI_MODEL || "gpt-5.5",
    keyEnv: "OPENAI_API_KEY",
    headerName: "authorization",           // value = "Bearer <key>"
  },
  gemini: {
    wire: "gemini",
    // Gemini keys the model into the path; the caller appends ?key=<key> (never in a header/log).
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    model: process.env.PRISM_HERMES_GEMINI_MODEL || "gemini-3-pro",
    keyEnv: "GEMINI_API_KEY",
  },
};

export const VALID_TIERS = ["claude", "codex", "nvidia", "frontier"];

/** True iff a model id names a <think>-style reasoning model (verbose/latency risk even in tool-mode). Pure. */
export function isReasoningModel(id) {
  if (!id) return false;
  // deepseek-r1 / *-reasoning / qwq / *-thinking / o1/o3-style / nemotron *reason* variants
  return /(^|[-/])(r1|reasoner|reasoning|thinking|qwq)([-/.]|$)|deepseek[-.]?r1|o[13]-(preview|mini)|nemotron.*reason/i.test(id);
}

/** Resolve the NVIDIA model id from an alias or a raw id. Pure. Unknown alias -> the raw string (caller's risk). */
export function resolveNvidiaModel(nameOrAlias) {
  if (!nameOrAlias) return NVIDIA_DEFAULT_MODEL;
  return NVIDIA_MODELS[nameOrAlias] || nameOrAlias;
}

/** Read a key from an env map WITHOUT logging it. Returns the string or null. Pure (takes env). */
export function resolveKey(keyEnv, env = process.env) {
  if (!keyEnv) return null;
  const v = env[keyEnv];
  return v && String(v).trim() ? String(v) : null;
}

/**
 * Resolve an escalation target. Pure (takes an env map). NEVER throws -- returns {error} on any problem.
 * Shape: { tier, backend, model, endpoint?, keyEnv?, keyPresent?, wire?, headerName?, extraHeaders?, note? }
 *   backend: "claude-cli" (spawn claude.exe) | "http" (fetch endpoint).
 */
export function resolveEscalationTarget(tier, opts = {}) {
  const env = opts.env || process.env;
  if (!VALID_TIERS.includes(tier)) {
    return { error: `unknown tier '${tier}' (valid: ${VALID_TIERS.join(", ")})` };
  }

  if (tier === "claude") {
    // Subscription lane -- no API key; executed by spawning claude.exe -p (handled in the facade).
    return { tier, backend: "claude-cli", model: CLAUDE_MODEL, note: "Claude Max subscription ($0 marginal)" };
  }

  if (tier === "codex") {
    // ChatGPT-subscription lane via the Codex CLI (OAuth in ~/.codex; no API key). Executed by spawning
    // `node codex.js exec --sandbox read-only --output-last-message` (handled in the facade). $0 pay-per-token.
    return { tier, backend: "codex-cli", model: CODEX_MODEL, note: "GPT-5.x via ChatGPT subscription (Codex CLI, $0 API)" };
  }

  if (tier === "nvidia") {
    const model = resolveNvidiaModel(opts.model);
    const key = resolveKey("NVIDIA_API_KEY", env);
    const t = {
      tier, backend: "http", wire: "openai", endpoint: NVIDIA_ENDPOINT, model,
      keyEnv: "NVIDIA_API_KEY", headerName: "authorization", keyPresent: !!key,
    };
    if (!key) t.error = "NVIDIA_API_KEY not set in env -- cannot escalate to NVIDIA";
    if (isReasoningModel(model)) t.note = `WARNING: ${model} looks like a reasoning model (verbose <think> output)`;
    return t;
  }

  // tier === "frontier"
  const providerName = opts.provider || process.env.PRISM_HERMES_FRONTIER_PROVIDER || "";
  const p = FRONTIER_PROVIDERS[providerName];
  if (!p) {
    return {
      error: `frontier provider not configured -- set PRISM_HERMES_FRONTIER_PROVIDER (one of: `
        + `${Object.keys(FRONTIER_PROVIDERS).join(", ")}) or pass opts.provider`,
    };
  }
  const key = resolveKey(p.keyEnv, env);
  const t = {
    tier, backend: "http", wire: p.wire, endpoint: p.endpoint,
    model: opts.model || p.model, provider: providerName,
    keyEnv: p.keyEnv, headerName: p.headerName, extraHeaders: p.extraHeaders, keyPresent: !!key,
  };
  if (!key) t.error = `${p.keyEnv} not set in env -- operator must set the frontier key (never entered by Claude)`;
  // Symmetry with the nvidia tier (scrutiny arm B P2): flag a reasoning-model OVERRIDE. Immaterial in
  // tool-mode (a one-shot HTTP call can't hang the loop), but advisory so a `<think>` override is visible.
  if (isReasoningModel(t.model)) t.note = `WARNING: ${t.model} looks like a reasoning model (verbose <think> output)`;
  return t;
}

/** Build an OpenAI-compatible chat body (NVIDIA + OpenAI + most NIM). Pure. */
export function buildChatBody(model, prompt, { maxTokens = 2048, temperature = 0.3 } = {}) {
  return { model, messages: [{ role: "user", content: String(prompt) }], max_tokens: maxTokens, temperature, stream: false };
}

/** Build an Anthropic Messages body. Pure. */
export function buildAnthropicBody(model, prompt, { maxTokens = 2048 } = {}) {
  return { model, max_tokens: maxTokens, messages: [{ role: "user", content: String(prompt) }] };
}

/** Extract the answer text from a parsed response, per wire protocol. Pure. Returns "" if not found. */
export function extractAnswer(wire, json) {
  if (!json || typeof json !== "object") return "";
  try {
    if (wire === "anthropic") {
      const blocks = json.content;
      if (Array.isArray(blocks)) return blocks.filter((b) => b && b.type === "text").map((b) => b.text).join("").trim();
      return "";
    }
    if (wire === "gemini") {
      const parts = json.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) return parts.map((p) => p.text || "").join("").trim();
      return "";
    }
    // openai-compatible (NVIDIA, OpenAI)
    return (json.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}
