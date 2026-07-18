// tier: T4
// ollama-mode-sufficiency.mjs (slot:alpha 2026-06-25, U-ALPHA-OLLAMA-MODE-SUFFICIENCY)
//
// Per-MODE measured "minimum-sufficient model" floor for ask-ollama's loaded-first selection.
//
// WHY: ask-ollama's non-codegen loaded-first pick uses OFFLOAD_LOADED_PREFERENCE -- a BIG-FIRST
// list that DELIBERATELY excludes the tiny coders (1.5b/7b) so a too-small warm model never serves
// a quality-sensitive offload (scripts/ask-ollama.test.mjs:100 pins that gate). That exclusion was
// the CORRECT default while there was NO per-mode quality measurement: "is 7b good enough for a
// summarize?" had no proof, so the design conservatively preferred to cold-load a substantial model.
//
// That blocker is now LIFTED -- but ONLY for the two modes that were actually MEASURED. The
// generative stress battery (LLM-judge, qwen2.5-coder:32b grades semantic fact-capture, n=3 hard
// tier, reaper-safe per-model invocations) produced the judged ladder below
// (state/shared/ollama-generative-stratified-2026-06-25.md; commits 014cfefb46 -> 056d0710bc ->
// 48f1d1266c). Read the ladder as: does the cheap coder MATCH 32b across the full difficulty range?
//
//   task               1.5b   7b     14b           32b      <- judged % (LLM-judge, semantic)
//   summarize-easy     100%   100%   100%          100%
//   summarize-medium   100%   100%   0%(ns1/2)     100%
//   summarize-hard     0%     0%     33%(ns1/3)    33%       <- NOBODY passes; all unusable
//   explain-easy       100%   100%   100%          100%
//   explain-medium     100%   100%   100%          100%
//   explain-hard       67%    100%   100%          67%       <- 7b MATCHES/BEATS 32b
//
// FINDING (the only claim wired here -- R12 conservative): for `summarize` and `explain`,
// qwen2.5-coder:7b is NON-INFERIOR to qwen2.5-coder:32b at EVERY measured difficulty -- a tie on
// easy/medium, a tie on hard-summarize (both fail, so 32b buys nothing), and a WIN on hard-explain
// (7b 100% vs 32b 67%, treated as a tie under n=3 variance). So a WARM 7b is a strictly-safe pick
// for these two modes -- equal quality, ~5GB vs ~20GB VRAM, faster inference. This is the measured
// "max-utilize the local LLMs" lever the architecture memory named
// ([[reference_ollama_executor_selection_architecture_2026_06_25]]).
//
// 1.5b is EXCLUDED on purpose: it ties 7b everywhere EXCEPT hard-explain (67% vs 100%), so it is
// below the measured floor -- the existing 1.5b quality gate (ask-ollama.test.mjs:100) stays honest.
// codegen / triage / viz / ask / rerank are NOT in the judged battery (no generative-quality data),
// so they get NO cheap floor here -- their big-first preference is unchanged (R13: never put a
// consumer atop an unproven dependency). Extend MODE_MIN_SUFFICIENT only when a mode is MEASURED.
//
// PURE: no I/O, no throw, never mutates the caller's base array. The cheap floor is PREPENDED so a
// warm 7b wins; if 7b is COLD the strict warm-pick falls straight through to the big-first list
// (no cold-load) -- exactly the warmth-aware design loaded-first exists to protect.

/**
 * Measured minimum-sufficient cheap-tier prefix per offload mode. Only modes with judged generative
 * quality data appear here; absence = "no measurement -> use the base big-first preference unchanged".
 * Order within a mode is best-first (cheapest measured-sufficient model first).
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const MODE_MIN_SUFFICIENT = Object.freeze({
  summarize: Object.freeze(["qwen2.5-coder:7b"]),
  explain: Object.freeze(["qwen2.5-coder:7b"]),
});

/**
 * Build the loaded-first preference list for `mode`: for a MEASURED mode, prepend its cheap-sufficient
 * floor ahead of the caller's base (big-first) preference, de-duplicated, so a WARM cheap model is
 * preferred at equal-or-better measured quality; for any UNMEASURED mode, return the base unchanged.
 *
 * The strict warm-pick semantics of the caller (pickLoadedChatModel(..., {strict:true})) mean a
 * prepended model that is NOT warm is simply skipped -- so this can ONLY change the result when the
 * cheap floor is already resident in VRAM (no cold-load, no eviction). Fail-soft on a bad `mode`.
 *
 * @param {string} mode  ask-ollama mode (summarize/explain/triage/viz/ask/rerank/codegen)
 * @param {readonly string[]} basePreference  the big-first OFFLOAD_LOADED_PREFERENCE
 * @returns {string[]} a NEW array; never the caller's `basePreference` reference
 */
export function loadedPreferenceForMode(mode, basePreference) {
  const base = Array.isArray(basePreference) ? basePreference.filter(Boolean).map(String) : [];
  const key = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  const floor = MODE_MIN_SUFFICIENT[key];
  if (!floor || !floor.length) return base.slice();
  const seen = new Set();
  const out = [];
  for (const name of [...floor, ...base]) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * True iff `mode` has a measured cheap-tier floor (i.e. loadedPreferenceForMode will prepend one).
 * Lets a caller / telemetry distinguish "downshift-eligible" modes without re-deriving the table.
 * @param {string} mode
 * @returns {boolean}
 */
export function hasMeasuredCheapFloor(mode) {
  const key = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  const floor = MODE_MIN_SUFFICIENT[key];
  return !!(floor && floor.length);
}

/**
 * The single cheapest measured-sufficient model for `mode` (the first/best-first floor entry), or
 * null for an unmeasured mode. The ONE source of truth for "which cheap model should be warm to
 * serve this mode" -- used both by loadedPreferenceForMode (selection) and the cheap-tier self-prime
 * (activation) so the two can never disagree on the floor model.
 * @param {string} mode
 * @returns {string|null}
 */
export function cheapFloorForMode(mode) {
  const key = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  const floor = MODE_MIN_SUFFICIENT[key];
  return floor && floor.length ? floor[0] : null;
}
