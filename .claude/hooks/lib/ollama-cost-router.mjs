// tier: T4
// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
//
// Replaces hardcoded "first-of-preference-list" model selection with a
// category → tier → model decision. Smaller / faster models for trivial
// tasks (classify, format-convert, prism-inventory); larger / more
// capable models for complex codegen / multi-step reasoning.
//
// Cost proxy: VRAM footprint (≈ proxy for latency + GPU pressure + watt).
// For cheap tasks the cheaper choice is strictly dominant — output quality
// is indistinguishable but the resource bill is lower and the answer is
// faster, which keeps the GPU free for whatever the higher-tier work
// actually needs.
//
// PURE — no IO, no globals, no side effects. Tests inject `available`.
// The host hook is responsible for fetching the list from /api/tags.
//
// FOUR TIERS:
//   cheap     <4B params      Trivial classify / format / inventory dump
//   balanced  4-8B params     Summary / explain / docstring        (DEFAULT)
//   strong    13-15B params   Code reasoning, multi-step
//   best      30B+ params     Complex codegen / scaffold / refactor
//
// Categories come from ollama-task-offloader.mjs OFFLOADABLE_PATTERNS.
// Adding a new category in the offloader without adding it to
// CATEGORY_TIER here is non-fatal — it falls through to "balanced",
// matching the prior behaviour of the hardcoded preference list.

export const TIER_PREFERENCES = Object.freeze({
  cheap: Object.freeze([
    "qwen2.5-coder:1.5b",
    "llama3.2:3b",
    "qwen2.5:3b",
    "phi3:mini",
  ]),
  balanced: Object.freeze([
    "qwen2.5-coder:7b",
    "codellama:7b",
    "deepseek-coder:6.7b",
    "qwen2.5:7b",
  ]),
  strong: Object.freeze([
    "qwen2.5-coder:14b",
    "deepseek-r1:14b", // reasoning / error-triage workhorse — installed on this host
    "qwen2.5:14b",
    "deepseek-coder:33b-instruct",
  ]),
  best: Object.freeze([
    "qwen2.5-coder:32b",
    "deepseek-coder-v2:16b",
    "qwen2.5:32b",
  ]),
});

// Map of known offloader categories → target tier.
// Unknown categories fall through to "balanced" (= the previous default).
export const CATEGORY_TIER = Object.freeze({
  format_convert:    "cheap",
  prism_inventory:   "cheap",
  prism_introspect:  "cheap",
  classification:    "cheap",
  summary:           "balanced",
  explanation:       "balanced",
  documentation:     "balanced",
  git_summary:       "balanced",
  prism_audit:       "balanced",
  search_synthesis:  "balanced",
});

export const TIER_ORDER = Object.freeze(["cheap", "balanced", "strong", "best"]);

/**
 * Pick the best available Ollama model for a given task category.
 *
 * Algorithm:
 *   1. Resolve the category to a target tier (default "balanced").
 *   2. Search that tier's preference list; first match wins.
 *   3. If nothing in the target tier is available, ESCALATE upward only —
 *      cheap → balanced → strong → best. Never de-escalate: degrading a
 *      strong-spec'd task to a 1.5B model is worse than spending the
 *      larger model the task asked for.
 *   4. If no tier matches at all, fall back to the first entry in
 *      `available` (last-resort — preserves prior "pick something"
 *      behaviour) and stamp tier=`"fallback"` so the caller can
 *      flag the tier mismatch.
 *
 * @param {{ category: string, available: string[] }} args
 * @returns {{ model: string|null, tier: string, reason: string }}
 */
export function routeModelForTask({ category, available }) {
  if (!Array.isArray(available) || available.length === 0) {
    return { model: null, tier: "none", reason: "no models available" };
  }
  // Defensive: filter to strings only — a malformed model object slipping in
  // would otherwise crash the .includes() check below.
  const av = available.filter((m) => typeof m === "string" && m.length > 0);
  if (av.length === 0) {
    return { model: null, tier: "none", reason: "no string-typed models" };
  }

  const requestedTier = (typeof category === "string" && CATEGORY_TIER[category]) || "balanced";
  const startIdx = TIER_ORDER.indexOf(requestedTier);
  // startIdx is always >=0 because CATEGORY_TIER values are constrained to
  // TIER_ORDER entries, but the bounds check costs ~nothing and protects
  // against a future typo in the constants table.
  if (startIdx < 0) {
    return { model: av[0], tier: "fallback", reason: `unknown tier "${requestedTier}"` };
  }

  for (let i = startIdx; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    for (const pref of TIER_PREFERENCES[tier]) {
      if (av.includes(pref)) {
        return {
          model: pref,
          tier,
          reason: i === startIdx
            ? "target tier"
            : `escalated ${requestedTier} → ${tier}`,
        };
      }
    }
  }

  // Nothing in the curated tiers — fall back to whatever the host has.
  return { model: av[0], tier: "fallback", reason: "no preferred model in any tier" };
}
