/**
 * v11-operator-style-twin.mjs — per-operator preference fingerprint.
 *
 * Today: every operator on the shop floor has a *style* (default feed
 * override %, default rapid override %, peck-depth preference, dwell
 * usage, M0/M1 stops at safe points, RPM bias for chatter sensitivity).
 * PRISM emits canonical post output that ignores this — so operators
 * always tweak something at the machine, which (a) costs setup minutes,
 * (b) drifts the canonical post away from what actually ran, and (c)
 * loses tribal preference data forever.
 *
 * This pure-fn library carries a per-operator preference twin:
 *   { feedOverridePct, rapidOverridePct, preferPeckDrill, addM1AtToolChange,
 *     chatterRiskTolerance, dwellMsAfterToolChange }
 *
 * Operators contribute observations via reportOverrideEvent() (one row
 * per measured deviation from the canonical post). The twin updates as
 * an exponentially-weighted moving average (EWMA) — recent style wins,
 * but historical drift averages in. EWMA weight is configurable
 * (DEFAULT_EWMA_ALPHA=0.3 → ~3-observation half-life).
 *
 * applyStyleToPost() folds the twin's preferences INTO the canonical
 * post output, returning a per-operator personalized version. This is
 * the unit of adoption: operators see their own preferences baked in
 * on first run, no manual tweaking needed.
 *
 * ROI: tier-A $1.5K/mo + adoption multiplier. Direct savings come from
 * eliminated re-tweaks at machine (5-10 min/program × 20 programs/wk).
 * Adoption multiplier: operators trust + use posts they recognize as
 * "theirs" → PRISM penetration grows.
 *
 * Pure functions only. Caller persists state per (operatorId).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-OPERATOR-STYLE-TWIN
 * @slot echo · @iter 32 · @date 2026-05-27
 */

export const STYLE_TWIN_SCHEMA_VERSION = 1;
export const DEFAULT_EWMA_ALPHA = 0.3;
export const FEED_OVERRIDE_NEUTRAL = 100;
export const RAPID_OVERRIDE_NEUTRAL = 100;
export const DEFAULT_DWELL_MS = 0;
export const CHATTER_TOLERANCE_NEUTRAL = 0.5;
export const MIN_OBSERVATIONS_FOR_STABLE = 5;

/** Pure: create a fresh operator-style twin with neutral defaults. */
export function createOperatorTwin(args) {
  const a = args || {};
  if (typeof a.operatorId !== "string" || a.operatorId.length === 0) return null;
  const alpha = Number.isFinite(Number(a.ewmaAlpha)) && Number(a.ewmaAlpha) > 0 && Number(a.ewmaAlpha) <= 1
    ? Number(a.ewmaAlpha)
    : DEFAULT_EWMA_ALPHA;
  return {
    schemaVersion: STYLE_TWIN_SCHEMA_VERSION,
    operatorId: a.operatorId,
    ewmaAlpha: alpha,
    observationCount: 0,
    feedOverridePct: FEED_OVERRIDE_NEUTRAL,
    rapidOverridePct: RAPID_OVERRIDE_NEUTRAL,
    preferPeckDrill: false,
    addM1AtToolChange: false,
    chatterRiskTolerance: CHATTER_TOLERANCE_NEUTRAL,
    dwellMsAfterToolChange: DEFAULT_DWELL_MS,
    lastUpdatedIso: null,
  };
}

/** Pure: fold one override-event into the twin (immutable, EWMA blend). */
export function reportOverrideEvent(twin, event) {
  if (!twin || !event || typeof event !== "object") return twin;
  const alpha = twin.ewmaAlpha;
  let next = { ...twin };
  let updated = false;

  if (Number.isFinite(Number(event.feedOverridePct))) {
    next.feedOverridePct = (1 - alpha) * twin.feedOverridePct + alpha * Number(event.feedOverridePct);
    updated = true;
  }
  if (Number.isFinite(Number(event.rapidOverridePct))) {
    next.rapidOverridePct = (1 - alpha) * twin.rapidOverridePct + alpha * Number(event.rapidOverridePct);
    updated = true;
  }
  if (Number.isFinite(Number(event.chatterRiskTolerance))) {
    const v = Number(event.chatterRiskTolerance);
    if (v >= 0 && v <= 1) {
      next.chatterRiskTolerance = (1 - alpha) * twin.chatterRiskTolerance + alpha * v;
      updated = true;
    }
  }
  if (Number.isFinite(Number(event.dwellMsAfterToolChange))) {
    const v = Number(event.dwellMsAfterToolChange);
    if (v >= 0) {
      next.dwellMsAfterToolChange = (1 - alpha) * twin.dwellMsAfterToolChange + alpha * v;
      updated = true;
    }
  }
  if (typeof event.preferPeckDrill === "boolean") {
    next.preferPeckDrill = event.preferPeckDrill;
    updated = true;
  }
  if (typeof event.addM1AtToolChange === "boolean") {
    next.addM1AtToolChange = event.addM1AtToolChange;
    updated = true;
  }
  if (!updated) return twin;
  next.observationCount = twin.observationCount + 1;
  next.lastUpdatedIso = typeof event.timestampIso === "string" ? event.timestampIso : twin.lastUpdatedIso;
  return next;
}

/** Pure: should the operator's twin be trusted (≥ MIN_OBSERVATIONS_FOR_STABLE)? */
export function isStable(twin) {
  if (!twin) return false;
  return twin.observationCount >= MIN_OBSERVATIONS_FOR_STABLE;
}

/** Pure: how much has the twin drifted from the canonical neutral baseline? */
export function deviationFromNeutral(twin) {
  if (!twin) return null;
  return {
    feedOverridePctDelta: twin.feedOverridePct - FEED_OVERRIDE_NEUTRAL,
    rapidOverridePctDelta: twin.rapidOverridePct - RAPID_OVERRIDE_NEUTRAL,
    chatterToleranceDelta: twin.chatterRiskTolerance - CHATTER_TOLERANCE_NEUTRAL,
    dwellMsDelta: twin.dwellMsAfterToolChange - DEFAULT_DWELL_MS,
  };
}

/** Pure: apply the twin's preferences to a canonical post-output object. */
export function applyStyleToPost(twin, canonicalPost) {
  if (!twin || !canonicalPost || typeof canonicalPost !== "object") return canonicalPost;
  if (!isStable(twin)) {
    return { ...canonicalPost, styleApplied: false, styleReason: "twin_undertrained" };
  }
  const out = { ...canonicalPost, styleApplied: true, operatorId: twin.operatorId };
  if (Number.isFinite(Number(canonicalPost.baseFeedrate))) {
    out.adjustedFeedrate = canonicalPost.baseFeedrate * (twin.feedOverridePct / 100);
  }
  if (Number.isFinite(Number(canonicalPost.baseRapidrate))) {
    out.adjustedRapidrate = canonicalPost.baseRapidrate * (twin.rapidOverridePct / 100);
  }
  if (twin.addM1AtToolChange) {
    out.toolChangeMcodes = [...(canonicalPost.toolChangeMcodes || []), "M1"];
  }
  if (twin.dwellMsAfterToolChange > 0) {
    out.toolChangeDwellMs = twin.dwellMsAfterToolChange;
  }
  if (twin.preferPeckDrill) {
    out.preferPeckOverPlunge = true;
  }
  return out;
}

/** Pure: render an operator-readable .cps comment block summarizing the twin. */
export function renderTwinAdvisory(twin) {
  const lines = ["(===== PRISM OPERATOR STYLE TWIN =====)"];
  if (!twin) {
    lines.push("(  no twin)");
  } else {
    lines.push(`(  operator: ${twin.operatorId})`);
    lines.push(`(  observations: ${twin.observationCount} (stable: ${isStable(twin) ? "yes" : "no"}))`);
    lines.push(`(  feed override: ${twin.feedOverridePct.toFixed(1)}%)`);
    lines.push(`(  rapid override: ${twin.rapidOverridePct.toFixed(1)}%)`);
    lines.push(`(  chatter tolerance: ${twin.chatterRiskTolerance.toFixed(2)})`);
    lines.push(`(  dwell after tool change: ${twin.dwellMsAfterToolChange.toFixed(0)} ms)`);
    lines.push(`(  prefer peck drill: ${twin.preferPeckDrill ? "yes" : "no"})`);
    lines.push(`(  add M1 at tool change: ${twin.addM1AtToolChange ? "yes" : "no"})`);
  }
  lines.push("(=====================================)");
  return lines.join("\n");
}

/** Pure: summary object for dashboards. */
export function summarizeTwin(twin) {
  if (!twin) return null;
  return {
    schemaVersion: STYLE_TWIN_SCHEMA_VERSION,
    operatorId: twin.operatorId,
    observationCount: twin.observationCount,
    stable: isStable(twin),
    ewmaAlpha: twin.ewmaAlpha,
    deviation: deviationFromNeutral(twin),
    lastUpdatedIso: twin.lastUpdatedIso,
  };
}
