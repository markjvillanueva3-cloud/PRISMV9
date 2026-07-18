/**
 * grok-capability-rank.mjs -- single source of truth for "which Grok model is the
 * HIGHEST CAPABILITY" (operator /goal 2026-06-26: "switch default model of hermes cli
 * and hermes agents to grok highest capability").
 *
 * The Hermes proxy maps a requested id to a concrete upstream (GrokClientEngine.ts:67,
 * e.g. grok-4 -> grok-4.3) and `/v1/models` may list 0..N grok ids in ARBITRARY order.
 * The old resolvers (ask-hermes resolveModel / hermes-mcp-server resolveModel) returned
 * the FIRST listed id -- not the most capable. This lib ranks a live id list so the
 * default resolves to the highest-capability grok AVAILABLE, WITHOUT hardcoding a
 * guessed model id: the proxy is the source of truth for what exists, we only RANK it.
 *
 * The capability ordering is DERIVED from the codebase's own documented lineup
 * (GrokClientEngine.ts:7,22 -- "grok-4 (most powerful) ... grok-4-mini, grok-3,
 * grok-3-mini, grok-code-fast-1"), NOT invented: parsed major.minor version dominates,
 * then a tier bonus (reasoning/thinking/heavy/pro/max/ultra) and a small-variant penalty
 * (mini/fast/code/nano/lite/flash/small). So for a live list
 *   [grok-3, grok-4, grok-4.3, grok-4.20-0309-reasoning, grok-4-mini, grok-code-fast-1]
 * the winner is grok-4.20-0309-reasoning, and the documented descending order
 *   grok-4 > grok-4-mini > grok-3 > grok-3-mini > grok-code-fast-1
 * is preserved exactly.
 *
 * Pure (no IO). Helpers are unit-tested in grok-capability-rank.test.mjs.
 */

/**
 * Proven served default when the proxy lists NOTHING -- HERMES-FULL-ASSESSMENT-2026-06-17
 * bravo profile `model.default`; the proxy maps grok-4 -> this. NOT a guessed id: it is the
 * value already configured fleet-wide (ask-hermes.mjs / verified-offload-tiered.mjs /
 * MultiModelConsensusEngine.hermesAgentLenses). An operator pins a higher id (the instant
 * xAI ships one) via PRISM_HERMES_PREFERRED_MODEL -- no code change.
 */
export const GROK_CAPABILITY_DEFAULT = "grok-4.3";

/** A real-but-non-grok id is selectable as a LAST resort (below every grok), never above one. */
const NON_GROK_SCORE = -1e6;
/** mini/fast/code/nano/lite/flash/small: a cheaper, lower-capability variant of its version. */
const SMALL_VARIANT_PENALTY = 500;
/** reasoning/thinking/heavy/pro/max/ultra: the more-capable variant of a given version. */
const TIER_BONUS = 5;

// Global (/g) so a multi-marker id (grok-3-mini-fast) is penalised per marker, not once.
// Used ONLY via String.match (which resets lastIndex) -- never .test() (stateful with /g).
const SMALL_RE = /(?:^|[-_\s])(mini|fast|code|nano|lite|flash|small)(?=[-_\s]|$)/gi;
const TIER_RE = /(?:^|[-_\s])(reasoning|thinking|heavy|pro|max|ultra)(?=[-_\s]|$)/gi;
// xAI ships BOTH grok-4-fast-reasoning AND grok-4-fast-non-reasoning. The bare "reasoning"
// inside "non-reasoning" must NOT earn the reasoning tier bonus, else the non-reasoning
// (lower-capability) variant ties/out-ranks the reasoning one. A non-reasoning marker
// suppresses the tier bonus entirely.
const NON_REASONING_RE = /non[-_]reasoning/i;

/**
 * Numeric capability score for one model id; higher = more capable. Pure.
 * A blank / non-string id scores -Infinity (it is not a model, never selectable).
 * A real but non-grok id scores NON_GROK_SCORE (selectable only as a last resort).
 * @param {string} id
 * @returns {number}
 */
export function rankGrokModel(id) {
  if (typeof id !== "string" || !id.trim()) return -Infinity;
  const s = id.trim().toLowerCase();
  if (!s.startsWith("grok")) return NON_GROK_SCORE;
  // version: the first major(.minor) immediately after "grok-" (grok-4.20-0309 -> 4.20;
  // grok-code-fast-1 -> no digit after "grok-" -> 0). Trailing date/build digits are ignored.
  const m = s.match(/grok-(\d+)(?:\.(\d+))?/);
  const major = m ? parseInt(m[1], 10) : 0;
  const minor = m && m[2] ? parseInt(m[2], 10) : 0;
  let score = major * 1000 + minor * 10;
  if (s.match(TIER_RE) && !NON_REASONING_RE.test(s)) score += TIER_BONUS;
  const smallMatches = s.match(SMALL_RE);
  if (smallMatches) score -= SMALL_VARIANT_PENALTY * smallMatches.length;
  return score;
}

/**
 * From a list of model ids, return the highest-capability one (max rankGrokModel).
 * Stable on ties: the FIRST id at the top score wins (preserves proxy order intent).
 * Blanks / non-strings are skipped. Returns null on empty / no-valid input. Pure.
 * @param {ReadonlyArray<string>} ids
 * @returns {string|null}
 */
export function pickHighestCapabilityGrok(ids) {
  if (!Array.isArray(ids)) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const id of ids) {
    if (typeof id !== "string" || !id.trim()) continue;
    const sc = rankGrokModel(id);
    if (sc > bestScore) { best = id; bestScore = sc; } // strict > => first wins a tie
  }
  return best;
}

/** True iff `id` names an xAI grok model (the lane the grok ranker is designed for). Pure. */
export function isGrokId(id) {
  return typeof id === "string" && /^\s*grok/i.test(id);
}

// NON-chat NVIDIA/NIM model markers -- embedding / rerank / reward / safety-guard / vision / parse
// families that CANNOT serve /v1/chat/completions. Conservative: only well-known non-chat tokens, so a
// real chat model is never excluded. Prevents defaulting a chat call onto e.g. baai/bge-m3 (-> 400/404).
// WHOLE-TOKEN boundaries on BOTH sides: `(?:^|[-/])` on the left and `(?=[-/]|$)` on the right, so a
// marker only matches a whole id segment -- a future chat id that merely STARTS with a marker (e.g.
// `guardrails-chat`) is NOT wrongly excluded, while every real segment id (`...-guard-4`, `.../bge-m3`,
// `nv-embedqa-...`, `...-content-safety`) still matches.
const NON_CHAT_RE = /(?:^|[-/])(?:embed|embedqa|bge|nemoretriever|rerank|reward|guard|nemoguard|content-safety|topic-control|safety-guard|parse|ocdrnet|nvclip|gliner|deplot|kosmos|fuyu|neva|vila|riva-translate|synthetic-video-detector|calibration|arctic-embed)(?=[-/]|$)/i;

/** True iff `id` looks like a NON-chat model (embedding/rerank/reward/guard/vision/parse). Pure. */
export function isNonChatModel(id) {
  return typeof id === "string" && NON_CHAT_RE.test(id);
}

/** For a NON-grok served list, choose the default model WITHOUT ever emitting an id the lane does not
 *  serve (the fleet-wide "no-model 404" bug): the configured `fallback` iff it is actually served, else
 *  the FIRST served chat-capable id, else the configured fallback as a last resort. Pure. */
export function pickServedChatModel(ids, fallback) {
  const served = Array.isArray(ids) ? ids.filter((x) => typeof x === "string" && x.trim()) : [];
  if (fallback && served.includes(String(fallback))) return String(fallback);
  const chat = served.find((x) => !isNonChatModel(x));
  if (chat) return chat;
  return fallback;
}

/**
 * Resolve the model id to send, honoring "highest capability" semantics. Pure.
 * Priority:
 *   1. explicit  (--model / PRISM_HERMES_MODEL)  -- this call pinned a specific model.
 *   2. preferred (PRISM_HERMES_PREFERRED_MODEL)  -- the operator pinned the fleet default to a
 *      specific high id (names a newer grok the instant xAI ships it, no code change);
 *      wins over auto-ranking BUT not over an explicit per-call --model.
 *   3. lane-aware default from `listed` (the live /v1/models ids):
 *        - GROK lane (list serves >=1 grok id): highest-capability grok via pickHighestCapabilityGrok.
 *        - NON-grok lane (NVIDIA cloud etc.): the configured SERVED model / first served chat-capable id
 *          via pickServedChatModel -- NEVER the blind first-listed id (grok-ranking a grok-less list
 *          returns the first entry, a coin-flip that 404s when the list leads with a non-chat model).
 *   4. fallback (GROK_CAPABILITY_DEFAULT) -- when nothing is listed / only non-chat models are served.
 * `listed` accepts a string[] (preferred) OR a single string (back-compat with the old
 * first-id resolvers) OR null/undefined.
 * @returns {{model: (string|null), source: ("explicit"|"preferred"|"listed"|"fallback"|"none")}}
 */
export function resolveHighestCapabilityModel({ explicit, preferred, listed, fallback } = {}) {
  if (explicit && String(explicit).trim()) return { model: String(explicit), source: "explicit" };
  if (preferred && String(preferred).trim()) return { model: String(preferred), source: "preferred" };
  const listArr = Array.isArray(listed) ? listed : (listed ? [listed] : []);
  if (listArr.length) {
    if (listArr.some(isGrokId)) {
      const best = pickHighestCapabilityGrok(listArr); // grok lane: highest-capability grok
      if (best) return { model: best, source: "listed" };
    } else {
      const served = pickServedChatModel(listArr, fallback); // non-grok lane: served model, never blind first-listed
      // 'listed' iff the pick came from the served list; 'fallback' iff it is the last-resort configured default.
      if (served && String(served).trim()) return { model: String(served), source: listArr.includes(served) ? "listed" : "fallback" };
    }
  }
  if (fallback && String(fallback).trim()) return { model: String(fallback), source: "fallback" };
  return { model: null, source: "none" };
}
