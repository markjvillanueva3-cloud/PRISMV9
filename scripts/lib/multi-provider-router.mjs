#!/usr/bin/env node
// U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24 — classification + telemetry library
// for PRISM's multi-provider AI routing layer (Brij "AI Infrastructure Master
// Tree" layer 02 — Frontier Models).
//
// PURPOSE: When Claude rate-limits, the operator or any automation layer needs
// a deterministic answer to "which provider should handle THIS task?" without
// making actual API calls. This library is pure classification logic + outcome
// telemetry — no network I/O, no LLM calls.
//
// DESIGN:
//   classifyTask(prompt, context?)
//     → { primaryProvider, fallbackChain[], reasoning, taskCategory }
//
//   recordOutcome({ provider, taskCategory, success, latencyMs })
//     → appends one JSONL line to state/shared/multi-provider-outcomes.jsonl
//
//   loadOutcomes(opts?)
//     → OutcomeRecord[] (skips malformed lines — defensive)
//
//   recommendProviderFromHistory(taskCategory, n=10)
//     → providerId string with best (success_rate × 1000 / mean_latency_ms)
//        for that category over the last n outcomes; falls back to
//        classifyTask primary when history is empty.
//
// Backing store mirrors the JSONL ledger pattern already used by:
//   - scripts/lib/episode-store.mjs  (episodes.jsonl)
//   - mcp-server/src/…/scrutiny-ledger.mjs  (SCRUTINY_LEDGER.json)
//   - knowledge/summaries/routing-decisions.jsonl  (AISystemRouterEngine)
//
// Relationship to AISystemRouterEngine.ts:
//   The TS engine owns BACKEND routing (docker / local-mcp / ollama vs Claude).
//   This library owns PROVIDER selection WITHIN the online/frontier tier:
//   claude vs gemini vs gpt-4-1 vs deepseek-r1 vs local ollama variants.
//   The two layers are additive — no duplication of classification logic.

import {
  existsSync,
  mkdirSync,
  appendFileSync,
  readFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

// Hardware-aware local-model resolution. detectHostClass maps THIS host's GPU
// class (via golf's hostname-keyed fleet-reaper presets) to a ModelRoutingEngine
// HardwareProfile, so the routing *reason* names the model the host will actually
// run (32b on Blackwell, 3b on the 8GB work box) instead of a stale hardcoded
// "7b". Path: scripts/lib → scripts → <repo root> → .claude/hooks/lib.
import { detectHostClass } from "../../.claude/hooks/lib/host-class.mjs";

// ---------------------------------------------------------------------------
// Named constants (no magic numbers)
// ---------------------------------------------------------------------------

const DEFAULT_HISTORY_WINDOW = 10;      // outcomes to consider in recommendProviderFromHistory
const MIN_LATENCY_GUARD_MS   = 1;       // guard against zero-latency records in score formula
const SCORE_LATENCY_SCALE    = 1000;    // ms→score multiplier: score = success_rate × (SCALE / latency_ms)

const CTX_CLAUDE    = 200_000;
const CTX_GEMINI    = 1_000_000;
const CTX_GPT41     = 128_000;
const CTX_DEEPSEEK  = 64_000;
const CTX_LOCAL     = 32_000;

// HardwareProfile → resident local model tag. The small coders (3b/7b/14b) were
// RETIRED fleet-wide (BLACKWELL-MODEL-UPGRADE-PLAN, 2026-06-04) so nothing can
// silently fall back to a low-quality model — every profile now names the kept
// floor (qwen2.5-coder:32b). The active fleet is a single 96GB Blackwell
// (home_blackwell); the weaker-host rows are dormant. If a genuinely sub-24GB
// host is ever added, it must set an explicit per-host override (env/its own
// preset) AND re-pull a sized model on THAT box — we do NOT keep a small tag here
// as a default (that is the exact accidental-revert the retirement closes).
const LOCAL_MODEL_BY_PROFILE = Object.freeze({
  home_blackwell: "qwen2.5-coder:32b",
  home_4080:      "qwen2.5-coder:32b",
  work_3080:      "qwen2.5-coder:32b",
  cloud_only:     "qwen2.5-coder:32b",
});
const DEFAULT_LOCAL_MODEL = "qwen2.5-coder:32b"; // when host class is unknown (null)

/**
 * Resolve the local Ollama model tag this host will actually run, given a
 * resolved HardwareProfile (or null). Pure — no I/O; the profile is supplied
 * by the caller (classifyTask resolves it once via detectHostClass).
 *
 * @param {"home_blackwell"|"home_4080"|"work_3080"|"cloud_only"|null} profile
 * @returns {string} the qwen2.5-coder model tag sized to the host
 */
export function localModelForProfile(profile) {
  if (profile && Object.hasOwn(LOCAL_MODEL_BY_PROFILE, profile)) {
    return LOCAL_MODEL_BY_PROFILE[profile];
  }
  return DEFAULT_LOCAL_MODEL;
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   tier: "frontier" | "capable" | "local",
 *   strengths: string[],
 *   costPerToken: number,        // USD per 1K output tokens (0 = free / local)
 *   contextLimit: number,        // tokens
 *   availability: "online" | "offline",
 * }} Provider
 */

/** @type {Provider[]} */
export const PROVIDERS = [
  {
    id: "claude",
    tier: "frontier",
    strengths: ["reasoning", "code", "safety", "long-context", "engine_building"],
    costPerToken: 0.015,
    contextLimit: CTX_CLAUDE,
    availability: "online",
  },
  {
    id: "gemini",
    tier: "frontier",
    strengths: ["reasoning", "code", "multimodal", "long-context"],
    costPerToken: 0.0035,
    contextLimit: CTX_GEMINI,
    availability: "online",
  },
  {
    id: "gpt-4-1",
    tier: "frontier",
    strengths: ["reasoning", "code", "classify", "summarize"],
    costPerToken: 0.008,
    contextLimit: CTX_GPT41,
    availability: "online",
  },
  {
    id: "deepseek-r1",
    tier: "capable",
    strengths: ["code", "reasoning", "math", "classify"],
    costPerToken: 0.0014,
    contextLimit: CTX_DEEPSEEK,
    availability: "online",
  },
  {
    id: "ollama-qwen",
    tier: "local",
    strengths: ["summarize", "classify", "explain", "docstring", "lint"],
    costPerToken: 0,
    contextLimit: CTX_LOCAL,
    availability: "offline",
  },
  {
    id: "ollama-deepseek",
    tier: "local",
    strengths: ["code", "classify", "explain"],
    costPerToken: 0,
    contextLimit: CTX_LOCAL,
    availability: "offline",
  },
];

// ---------------------------------------------------------------------------
// Task categories + routing table
// ---------------------------------------------------------------------------

/**
 * @typedef {"reasoning" | "code" | "summarize" | "physics" | "classify" |
 *           "search" | "batch" | "unknown"} TaskCategory
 */

/**
 * Per-category routing rules: primary provider id + ordered fallback chain.
 * Rules are intentionally keyword-driven and deterministic — no LLM needed.
 *
 * Alignment with AISystemRouterEngine.ts task classes:
 *   physics_validation → routed to docker/local-mcp by TS engine; here we
 *     surface "physics" as a distinct category but recommend prism_calc
 *     (local-mcp) and note it in reasoning rather than routing to a frontier LLM.
 *   reasoning, code, search, batch → mirror the TS class names where possible.
 */
const ROUTING_TABLE = {
  reasoning:  { primary: "claude",        fallback: ["gpt-4-1", "gemini", "deepseek-r1"] },
  code:       { primary: "claude",        fallback: ["deepseek-r1", "ollama-deepseek", "gpt-4-1"] },
  summarize:  { primary: "ollama-qwen",   fallback: ["gemini", "gpt-4-1", "claude"] },
  physics:    { primary: "claude",        fallback: ["gpt-4-1", "gemini"] },
  classify:   { primary: "ollama-qwen",   fallback: ["deepseek-r1", "gpt-4-1", "claude"] },
  search:     { primary: "ollama-qwen",   fallback: ["claude", "gpt-4-1"] },
  batch:      { primary: "ollama-qwen",   fallback: ["ollama-deepseek", "gemini"] },
  unknown:    { primary: "claude",        fallback: ["gpt-4-1", "gemini", "deepseek-r1"] },
};

// ---------------------------------------------------------------------------
// classifyTask
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   primaryProvider: string,
 *   fallbackChain: string[],
 *   reasoning: string,
 *   taskCategory: TaskCategory,
 * }} RouteResult
 */

/**
 * Classify a task and return the recommended provider chain.
 * Pure function — no I/O.
 *
 * @param {string} prompt - Task description or prompt text
 * @param {{ preferOffline?: boolean, excludeProviders?: string[],
 *           hostProfile?: ("home_blackwell"|"home_4080"|"work_3080"|"cloud_only"|null),
 *           detectHostClassImpl?: (opts?: object) => ("home_blackwell"|"home_4080"|"work_3080"|"cloud_only"|null) }} [context]
 *   `hostProfile` lets a caller (or test) pin the resolved HardwareProfile;
 *   when omitted the profile is resolved once via `detectHostClassImpl`
 *   (default: the real `detectHostClass`). Used ONLY to name the host-sized
 *   local model in the reason — never alters the routing decision.
 * @returns {RouteResult}
 */
export function classifyTask(prompt, context = {}) {
  if (typeof prompt !== "string") {
    throw new TypeError("classifyTask: prompt must be a string");
  }
  const t = prompt.toLowerCase();
  const { preferOffline = false, excludeProviders = [] } = context;

  // Resolve the host's local-model tier ONCE for honest reason text. A pinned
  // hostProfile (incl. an explicit null) wins; otherwise detect from this host.
  // detectHostClass never throws and returns null when the class is unknown.
  const hostProfile = Object.hasOwn(context, "hostProfile")
    ? context.hostProfile
    : (context.detectHostClassImpl || detectHostClass)();
  const localModel = localModelForProfile(hostProfile);

  /** @type {TaskCategory} */
  let taskCategory = "unknown";
  let reasonNote = "";

  // Search / lookup — checked FIRST: lookup verbs are unambiguous regardless of
  // domain nouns in the rest of the prompt (e.g. "find the engine that handles
  // thermal" is a search task, not a physics calculation).
  if (/(search|find\b|lookup|locate|grep|query\b|where is|what file|which engine)/.test(t)) {
    taskCategory = "search";
    reasonNote = "search/lookup — local indexes (MASTER_INDEX/Grep) preferred; LLM as last resort";
  }
  // Physics keywords — PRISM-specific; prefer local prism_calc
  else if (/(physics|kienzle|taylor|johnson[- ]cook|stress|deflect|chatter|cutting.force|tool.wear|thermal|feed.rate.calc|spindle.speed.calc)/.test(t)) {
    taskCategory = "physics";
    reasonNote = "physics/manufacturing domain detected — prefer local prism_calc; frontier as fallback";
  }
  // Reasoning / planning / strategy
  else if (/(reason|think|plan|design|strateg|why\b|explain\s+why|justify|infer|deduce|synthesize|architect)/.test(t)) {
    taskCategory = "reasoning";
    reasonNote = "reasoning/planning task — requires frontier synthesis capability";
  }
  // Code generation / review / debugging
  else if (/(write.*code|generate.*code|implement|refactor|debug|fix.*bug|unit.test|function\b|class\b|algorithm|regex|script)/.test(t)) {
    taskCategory = "code";
    reasonNote = "code task — Claude primary; DeepSeek-R1 strong local fallback";
  }
  // Summarize / distill — best offloaded to local LLM
  else if (/(summarize|summary|summarise|condense|tldr|distill|brief|synopsis|digest)/.test(t)) {
    taskCategory = "summarize";
    reasonNote = `summarization — cheap on local Ollama (${localModel}); frontier only if offline unavailable`;
  }
  // Classification / labeling / extraction
  else if (/(classif|label|categorize|tag\b|extract|parse|identify\b|detect\b|docstring|lint\b|annotate)/.test(t)) {
    taskCategory = "classify";
    reasonNote = "classification/extraction — ollama-qwen handles well locally";
  }
  // Batch / bulk processing
  else if (/(batch|bulk|\b\d{3,}\s*(files?|records?|lines?|programs?|parts?)|mass.process)/.test(t)) {
    taskCategory = "batch";
    reasonNote = "batch/bulk task — local Ollama most cost-effective";
  }
  else {
    taskCategory = "unknown";
    reasonNote = "no strong keyword signal — defaulting to claude for general competence";
  }

  const route = ROUTING_TABLE[taskCategory];
  let primary = route.primary;
  let fallback = [...route.fallback];

  // Apply preferOffline: demote online primaries in favour of local variants
  if (preferOffline) {
    const localProviders = PROVIDERS
      .filter((p) => p.availability === "offline")
      .map((p) => p.id);
    if (localProviders.length > 0 && !localProviders.includes(primary)) {
      // Promote first local provider as primary; push original primary to fallback
      const localPrimary = localProviders[0];
      fallback = [primary, ...fallback.filter((id) => id !== localPrimary)];
      primary = localPrimary;
      reasonNote += " [preferOffline: promoted local provider]";
    }
  }

  // Apply excludeProviders filter
  if (excludeProviders.length > 0) {
    const excluded = new Set(excludeProviders);
    if (excluded.has(primary)) {
      const next = fallback.find((id) => !excluded.has(id));
      if (next) {
        fallback = fallback.filter((id) => id !== next);
        primary = next;
        reasonNote += ` [excluded ${excludeProviders.join(",")} — promoted fallback]`;
      }
    }
    fallback = fallback.filter((id) => !excluded.has(id));
  }

  // Honest reason: if the FINAL routed primary is a local Ollama provider, name
  // the model this host will actually run (host-sized) so the reason reflects
  // the routed model — not a stale hardcoded tag. Skip when the summarize note
  // already names it (avoids a duplicate model mention for the common case).
  const primaryIsLocal = PROVIDERS.some(
    (p) => p.id === primary && p.availability === "offline",
  );
  if (primaryIsLocal && !reasonNote.includes(localModel)) {
    reasonNote += ` [routed local model: ${localModel}]`;
  }

  return {
    primaryProvider: primary,
    fallbackChain: fallback,
    reasoning: reasonNote,
    taskCategory,
  };
}

// ---------------------------------------------------------------------------
// Outcome telemetry
// ---------------------------------------------------------------------------

const DEFAULT_OUTCOMES_PATH = "H:/prism/state/shared/multi-provider-outcomes.jsonl";

/**
 * @typedef {{
 *   id: string,
 *   ts: string,
 *   provider: string,
 *   taskCategory: string,
 *   success: boolean,
 *   latencyMs: number,
 * }} OutcomeRecord
 */

/**
 * Append one outcome record to the JSONL telemetry store.
 * Best-effort: never throws on I/O failure.
 *
 * @param {{ provider: string, taskCategory: string, success: boolean, latencyMs: number }} outcome
 * @param {{ storePath?: string, writeImpl?: Function, mkdirImpl?: Function, existsImpl?: Function }} [opts]
 * @returns {string} assigned record id
 */
export function recordOutcome(outcome, opts = {}) {
  const { provider, taskCategory, success, latencyMs } = outcome;
  if (typeof provider !== "string" || provider.length === 0) {
    throw new TypeError("recordOutcome: provider required");
  }
  if (typeof taskCategory !== "string" || taskCategory.length === 0) {
    throw new TypeError("recordOutcome: taskCategory required");
  }
  if (typeof success !== "boolean") {
    throw new TypeError("recordOutcome: success must be boolean");
  }
  if (typeof latencyMs !== "number" || latencyMs < 0) {
    throw new TypeError("recordOutcome: latencyMs must be a non-negative number");
  }

  const path = opts.storePath || DEFAULT_OUTCOMES_PATH;
  const writeImpl = opts.writeImpl || appendFileSync;
  const mkdirImpl = opts.mkdirImpl || mkdirSync;
  const existsImpl = opts.existsImpl || existsSync;

  const id = `out-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  /** @type {OutcomeRecord} */
  const record = {
    id,
    ts: new Date().toISOString(),
    provider,
    taskCategory,
    success,
    latencyMs,
  };

  try {
    const dir = dirname(path);
    if (!existsImpl(dir)) mkdirImpl(dir, { recursive: true });
    writeImpl(path, JSON.stringify(record) + "\n", "utf8");
  } catch {
    // best-effort telemetry; never block routing on write failure
  }

  return id;
}

/**
 * Load all outcome records from the JSONL store.
 * Skips malformed lines defensively (R12: fail loud on logic, silent-skip on noise).
 *
 * @param {{ storePath?: string, readImpl?: Function, existsImpl?: Function }} [opts]
 * @returns {OutcomeRecord[]}
 */
export function loadOutcomes(opts = {}) {
  const path = opts.storePath || DEFAULT_OUTCOMES_PATH;
  const readImpl = opts.readImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;

  if (!existsImpl(path)) return [];

  let raw = "";
  try {
    raw = readImpl(path, "utf8");
  } catch {
    return [];
  }

  const results = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const rec = JSON.parse(trimmed);
      // Validate required shape; skip partial records
      if (
        typeof rec.provider === "string" &&
        typeof rec.taskCategory === "string" &&
        typeof rec.success === "boolean" &&
        typeof rec.latencyMs === "number"
      ) {
        results.push(rec);
      }
    } catch {
      // skip malformed line
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// recommendProviderFromHistory
// ---------------------------------------------------------------------------

/**
 * Score formula:
 *   score = success_rate × (1000 / mean_latency_ms)
 *
 * A fully-successful provider at 500 ms scores 2.0.
 * A 50%-successful provider at 200 ms scores 2.5 — faster wins when reliability
 * is equal, but reliability dominates when one provider keeps failing.
 *
 * Falls back to classifyTask primary when no history exists for that category.
 *
 * @param {TaskCategory} taskCategory
 * @param {number} [n] - number of most-recent outcomes to consider (default DEFAULT_HISTORY_WINDOW)
 * @param {{ storePath?: string }} [opts]
 * @returns {string} provider id
 */
export function recommendProviderFromHistory(taskCategory, n = DEFAULT_HISTORY_WINDOW, opts = {}) {
  if (typeof taskCategory !== "string" || taskCategory.length === 0) {
    throw new TypeError("recommendProviderFromHistory: taskCategory required");
  }

  const allOutcomes = loadOutcomes(opts);
  const MIN_WINDOW = 1; // at least one record when n is fractional/zero
  const relevant = allOutcomes
    .filter((r) => r.taskCategory === taskCategory)
    .slice(-Math.max(MIN_WINDOW, Math.floor(n)));

  if (relevant.length === 0) {
    // No history — fall back to static classification
    return classifyTask(`${taskCategory} task`, {}).primaryProvider;
  }

  // Group by provider
  /** @type {Map<string, { successCount: number, totalLatency: number, count: number }>} */
  const grouped = new Map();
  for (const rec of relevant) {
    if (!grouped.has(rec.provider)) {
      grouped.set(rec.provider, { successCount: 0, totalLatency: 0, count: 0 });
    }
    const g = grouped.get(rec.provider);
    g.count += 1;
    if (rec.success) g.successCount += 1;
    g.totalLatency += rec.latencyMs;
  }

  let bestProvider = null;
  let bestScore = -Infinity;

  for (const [providerId, stats] of grouped.entries()) {
    const successRate = stats.count > 0 ? stats.successCount / stats.count : 0;
    const meanLatency = stats.count > 0 ? stats.totalLatency / stats.count : Infinity;
    // Guard against zero latency (shouldn't happen, but defensive)
    const score = successRate * (SCORE_LATENCY_SCALE / Math.max(meanLatency, MIN_LATENCY_GUARD_MS));
    if (score > bestScore) {
      bestScore = score;
      bestProvider = providerId;
    }
  }

  return bestProvider ?? classifyTask(`${taskCategory} task`, {}).primaryProvider;
}

// ===========================================================================
// REACTIVE FALLBACK EXECUTOR (U-HERMES-LOCAL-AUTONOMY, slot:bravo 2026-06-04)
// ---------------------------------------------------------------------------
// classifyTask() above PLANS the provider chain; this layer EXECUTES it with
// reactive rate-limit fallback. It is the answer to "how will Hermes know when
// the limit hits and switch?": it does NOT poll a 5h gauge (that telemetry is
// absent on this host) — it reacts to the ACTUAL rate-limit error the API
// returns. Try the primary; on a 429 / overloaded / quota error, fall through
// to the next provider in the chain (e.g. Opus → local gpt-oss:120b →
// qwen3-coder:30b). A NON-rate-limit error fails loud immediately (never masks
// a real bug by silently trying another provider). Pure orchestration — the
// actual provider call is INJECTED, so it is fully unit-testable without network.
// ===========================================================================

/** Substrings/codes that mark a retriable rate-limit / capacity error. */
const RATE_LIMIT_RE = /\b(rate[ _-]?limit|ratelimited|429|too many requests|overloaded|over[ _-]?capacity|quota|exhausted|throttl|capacity|temporarily unavailable|service unavailable|503)\b/i;

/**
 * Classify whether an error is a retriable rate-limit / capacity condition
 * (vs a hard error like auth/bad-request/logic bug). Handles: HTTP status
 * objects ({status:429} / {statusCode:429}), Anthropic-style error envelopes
 * ({error:{type:'rate_limit_error'}} / {type:'overloaded_error'}), Error
 * messages, and bare strings. Defensive: null/undefined → false.
 *
 * @param {*} err
 * @returns {boolean}
 */
export function isRateLimitError(err) {
  if (err == null) return false;
  // explicit HTTP status
  const status = err.status ?? err.statusCode ?? err.code;
  if (status === 429 || status === 503) return true;
  if (typeof status === "string" && /^(429|503)$/.test(status)) return true;
  // Anthropic / OpenAI style error envelopes
  const etype = err?.error?.type ?? err?.type;
  if (typeof etype === "string" && /(rate_limit|overloaded|capacity|quota)/i.test(etype)) return true;
  // message / string match
  const msg = typeof err === "string" ? err : (err.message ?? err?.error?.message ?? "");
  return RATE_LIMIT_RE.test(String(msg));
}

/**
 * Execute a provider chain with reactive rate-limit fallback.
 *
 * @param {object} opts
 * @param {string[]} opts.chain        ordered provider ids to try (primary first)
 * @param {(provider:string, index:number)=>Promise<*>} opts.call  injected caller
 * @param {(err:*)=>boolean} [opts.shouldFallback]  default isRateLimitError
 * @param {(info:{from:string,to:string,err:*,elapsedMs:number})=>void} [opts.onFallback]
 * @param {()=>number} [opts.now]      injectable clock (tests)
 * @returns {Promise<{ok:true, provider:string, result:*, attempts:number, fellBack:boolean, errors:object[]}>}
 * @throws aggregate Error (code PROVIDER_FALLBACK_EXHAUSTED) when the chain is
 *         exhausted, OR rethrows immediately on a non-fallback-eligible error.
 */
export async function routeWithFallback({ chain, call, shouldFallback = isRateLimitError, onFallback, now = () => Date.now() } = {}) {
  if (!Array.isArray(chain) || chain.length === 0) {
    throw new Error("routeWithFallback: chain must be a non-empty array of provider ids");
  }
  if (typeof call !== "function") {
    throw new Error("routeWithFallback: call must be a (provider, index) => Promise<result> function");
  }
  const errors = [];
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const startedAt = now();
    try {
      const result = await call(provider, i);
      return { ok: true, provider, result, attempts: i + 1, fellBack: i > 0, errors };
    } catch (err) {
      const rateLimited = isRateLimitError(err);
      errors.push({ provider, error: String((err && err.message) || err), rateLimited });
      const hasMore = i < chain.length - 1;
      if (hasMore && shouldFallback(err)) {
        if (typeof onFallback === "function") {
          try { onFallback({ from: provider, to: chain[i + 1], err, elapsedMs: now() - startedAt }); } catch { /* observer must never break the route */ }
        }
        continue; // reactive fallback → next provider
      }
      // Non-fallback error OR chain exhausted → fail loud with full trail.
      const agg = new Error(
        `routeWithFallback ${hasMore ? "aborted (non-rate-limit error)" : "exhausted"} after ${i + 1} attempt(s): ` +
        errors.map((e) => `${e.provider}${e.rateLimited ? "(rate-limited)" : ""}`).join(" → "),
      );
      agg.code = "PROVIDER_FALLBACK_EXHAUSTED";
      agg.attempts = errors;
      agg.lastError = err;
      throw agg;
    }
  }
  throw new Error("routeWithFallback: no providers attempted"); // unreachable
}

/**
 * Convenience: classify the prompt → build [primary, ...fallbackChain] → execute
 * with reactive fallback. The full "decide which provider + actually run it,
 * surviving rate limits" loop in one call.
 *
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {object} [opts.context]   forwarded to classifyTask (e.g. {profile, excludeProviders})
 * @param {(provider:string, index:number)=>Promise<*>} opts.call
 *  + all routeWithFallback knobs (shouldFallback, onFallback, now).
 * @returns {Promise<{ok:true, provider:string, result:*, attempts:number, fellBack:boolean, taskCategory:string, chain:string[]}>}
 */
export async function routeTaskWithFallback({ prompt, context = {}, call, shouldFallback, onFallback, now } = {}) {
  const plan = classifyTask(prompt, context);
  const chain = [plan.primaryProvider, ...plan.fallbackChain].filter((v, idx, arr) => v && arr.indexOf(v) === idx);
  const r = await routeWithFallback({ chain, call, shouldFallback, onFallback, now });
  return { ...r, taskCategory: plan.taskCategory, chain };
}
