/**
 * rgs-complexity.mjs — improved complexity-tier + verdict adapter for the
 * rgs-tool-planner.
 *
 * Why this exists (U-COMPLEXITY-FALLBACK):
 *   The MS0 heuristic at `rgs-tool-planner.mjs:64` defaulted 57.6% of the
 *   pool to tier=M because `unit.effort` was 0 / undefined for most
 *   roadmap units (the upstream feed often lacks the field). The verdict
 *   regex `/integrat|reuse|existing|wire|compose/i` also missed common
 *   integrate-shaped work like doc renames, audits, and typo fixes —
 *   classifying them as "build" and routing them down build-shaped
 *   pipelines. Both bugs surface in the MS1 punch list (line 29).
 *
 * This module REPLACES the MS0 heuristic with a multi-signal cascade that
 * still produces {tier, verdict} (same return contract — sourceHash
 * compatibility, no checkpoint invalidation):
 *
 *   1. effort (min) > 0           — current authoritative signal
 *   2. estimated_hours (×60)      — alt schema some feeds emit
 *   3. estimated_minutes          — alt schema
 *   4. keyword markers in title   — strong, ordered:
 *        S: typo · rename · comment · docstring · doc-fix · cleanup · tidy
 *           · audit · review · scan · verify (no implement) · test-only
 *        L: rewrite · redesign · rearchitect · overhaul · MS\d+ context
 *        XL: new system · new architecture · build out · ground-up
 *        (else falls through to step 5)
 *   5. description-length soft hint:
 *        <80 char  → S
 *        <200 char → M
 *        <500 char → L
 *        else      → XL
 *   6. default M (existing fallback retained for empty units)
 *
 * Verdict (expanded from `/integrat|reuse|…/`):
 *   INTEGRATE markers cover doc/rename/audit/cleanup work the MS0 regex
 *   miscategorised as build. BUILD remains the default.
 *
 * Pure function (no I/O, no clock, no random) — every input fully
 * determines output. The test suite hammers each signal in isolation.
 */

/** @typedef {{ tier: "S"|"M"|"L"|"XL", verdict: "build"|"integrate" }} Complexity */

/** Effort-minute thresholds — mirror the original MS0 boundary semantics so
 * the cascade decisions on KNOWN-good effort produce identical output. */
export const EFFORT_THRESHOLDS = Object.freeze({
  S_MAX_MIN: 30,
  M_MAX_MIN: 120,
  L_MAX_MIN: 480,
});

/** Description-length soft-hint thresholds (chars). The cascade only reaches
 * here when no effort signal AND no keyword markers fire — the description
 * is then the last positive signal we have. Numbers chosen by inspection of
 * the 648-plan corpus: S=one-line fix, M=paragraph, L=multi-paragraph spec. */
export const DESC_LEN_THRESHOLDS = Object.freeze({
  S_MAX: 80,
  M_MAX: 200,
  L_MAX: 500,
});

/** Tier-mapping keyword patterns. Title-only; description is captured by the
 * length proxy below. ORDER MATTERS — earlier patterns win. */
const TITLE_KW_TIER_S = /\b(typo|rename|comment|docstring|doc-?fix|doc-?align|cleanup|tidy|audit|review|scan|test-?only|verify)\b/i;
const TITLE_KW_TIER_L = /\b(rewrite|redesign|rearchitect|overhaul|integrate-stack|full-?suite)\b/i;
const TITLE_KW_TIER_XL = /\b(new\s+system|new\s+architecture|new\s+engine|build\s+out|ground-?up|from-?scratch|greenfield)\b/i;

/** Verdict patterns. INTEGRATE includes everything from the original regex
 * PLUS doc/rename/audit/cleanup work that has no new code to write.
 *
 * NOTE: leading `\b` (not trailing) on purpose — `integrat` is a truncated
 * stem so a trailing `\b` would FAIL on "integrate" (the 'e' suffix prevents
 * the word boundary). Leading `\b` still excludes false positives like
 * "rewire" matching "wire". Tested in rgs-complexity.test.mjs. */
const VERDICT_INTEGRATE = /\b(integrat|reuse|existing|wire|compose|rename|doc-?fix|doc-?align|comment|fix\s+typo|audit|review|cleanup|tidy|hook-?up|surface)/i;

/**
 * Map an effort-minute number to a tier using the canonical thresholds.
 * Internal — callers should go through `complexityFor` so the full cascade
 * (with fallback signals) runs.
 *
 * @param {number} minutes  positive minutes; caller must filter ≤0 / NaN
 * @returns {"S"|"M"|"L"|"XL"}
 */
function effortMinutesToTier(minutes) {
  if (minutes < EFFORT_THRESHOLDS.S_MAX_MIN) return "S";
  if (minutes < EFFORT_THRESHOLDS.M_MAX_MIN) return "M";
  if (minutes < EFFORT_THRESHOLDS.L_MAX_MIN) return "L";
  return "XL";
}

/**
 * Try to derive a positive effort minute count from any of three alt schema
 * fields the upstream feeds emit. Returns NaN when nothing usable is found.
 *
 * @param {object} unit
 * @returns {number}  positive minutes, or NaN
 */
function extractEffortMinutes(unit) {
  const e = unit?.effort;
  if (typeof e === "number" && Number.isFinite(e) && e > 0) return e;
  const eh = unit?.estimated_hours;
  if (typeof eh === "number" && Number.isFinite(eh) && eh > 0) return eh * 60;
  const em = unit?.estimated_minutes;
  if (typeof em === "number" && Number.isFinite(em) && em > 0) return em;
  return NaN;
}

/**
 * Derive tier from keyword markers in the unit title. Returns null when no
 * pattern matches — caller falls through to the description-length proxy.
 *
 * @param {string} title
 * @returns {"S"|"L"|"XL"|null}
 */
function tierFromTitleKeywords(title) {
  if (TITLE_KW_TIER_XL.test(title)) return "XL";
  if (TITLE_KW_TIER_L.test(title)) return "L";
  if (TITLE_KW_TIER_S.test(title)) return "S";
  return null;
}

/**
 * Derive tier from description length. Always returns a tier — this is the
 * cascade's last positive signal before the default-M floor.
 *
 * @param {string} description
 * @returns {"S"|"M"|"L"|"XL"}
 */
function tierFromDescLength(description) {
  const len = description.length;
  if (len === 0) return "M"; // empty desc → default
  if (len < DESC_LEN_THRESHOLDS.S_MAX) return "S";
  if (len < DESC_LEN_THRESHOLDS.M_MAX) return "M";
  if (len < DESC_LEN_THRESHOLDS.L_MAX) return "L";
  return "XL";
}

/**
 * Derive {tier, verdict} from a roadmap unit using a multi-signal cascade.
 * Same return contract as the MS0 heuristic at rgs-tool-planner.mjs:64 so
 * existing sourceHash values in the checkpoint JSONL remain valid (a unit
 * whose effort was always set will hash identically).
 *
 * Cascade order: effort → estimated_hours → estimated_minutes → title
 * keywords → description length → default M.
 *
 * Verdict: INTEGRATE markers cover doc/rename/audit/cleanup work; BUILD
 * default for everything else.
 *
 * @param {{
 *   title?: string,
 *   description?: string,
 *   effort?: number,
 *   estimated_hours?: number,
 *   estimated_minutes?: number,
 * }} unit
 * @returns {Complexity}
 */
export function complexityFor(unit) {
  const safeUnit = unit ?? {};
  const title = String(safeUnit.title ?? "");
  const description = String(safeUnit.description ?? "");

  // 1-3: any positive numeric effort signal.
  const minutes = extractEffortMinutes(safeUnit);
  let tier;
  if (!Number.isNaN(minutes)) {
    tier = effortMinutesToTier(minutes);
  } else {
    // 4: title keyword markers (S/L/XL only — null falls through to desc length).
    const kwTier = tierFromTitleKeywords(title);
    if (kwTier) {
      tier = kwTier;
    } else {
      // 5: description length proxy.
      tier = tierFromDescLength(description);
    }
  }

  // Verdict: integrate when ANY title or description token signals integration.
  const text = title + " " + description;
  const verdict = VERDICT_INTEGRATE.test(text) ? "integrate" : "build";

  return { tier, verdict };
}
