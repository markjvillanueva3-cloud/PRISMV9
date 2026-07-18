#!/usr/bin/env node
/**
 * lathe-tip-classify.mjs -- slot:whiskey [KIENZLE: tribal free-text -> structured adjustment signal]
 * ==========================================================================
 * The verifiable CORE of the "tribal structured-adjustment" unit (R13 -- build the testable core
 * before the Ollama runner + the generation wiring). Turns a free-text lathe tip into a
 * `LatheTribalSignal`-shaped object the existing `LatheTribalIntegrationEngine` can consume, OR
 * marks it `advisory_only` (most vendor-catalog tips are tool/coating/holding advice with NO
 * quantitative speed/feed/depth change -- those stay advisory, surfaced by lathe-tribal-advisory).
 *
 * SAFETY: factors are CLAMPED to [FACTOR_MIN, FACTOR_MAX] = [0.25, 2.5] -- the EXACT band
 * `LatheTribalIntegrationEngine` uses (constants mirrored + cited, not a new physics constant).
 * A tribal signal can only ever BIAS within this band; it never overrides physics/safety. A
 * no-op factor (1.0) or any out-of-schema value is dropped -> if nothing parametric survives,
 * the tip is advisory_only (never a fabricated adjustment).
 *
 * Pure (no I/O) + exported for direct unit testing. The Ollama call lives in the runner.
 */

// Mirror LatheTribalIntegrationEngine contract (LatheOperationType / ISO / signal types / clamp band).
export const LATHE_OPS = new Set([
  "turn_rough", "turn_finish", "face", "bore", "thread", "part_off", "groove", "drill", "knurl", "chamfer",
]);
export const MATERIAL_ISO = new Set(["P", "M", "K", "N", "S", "H"]);
export const SIGNAL_TYPES = new Set(["positive", "negative", "constraint"]);
export const FACTOR_MIN = 0.25; // == LatheTribalIntegrationEngine FACTOR_MIN
export const FACTOR_MAX = 2.5;  // == LatheTribalIntegrationEngine FACTOR_MAX
// sfm_max is an ABSOLUTE surface-speed ceiling in ft/min (SFM) -- the unit LatheTribalSignal uses
// (NOT m/min; a units mismatch on a safety cap is a 3.28x error). A plausible turning band; a value
// outside it is a hallucination and is DROPPED (never becomes a trusted cap -- the consumer does not
// re-clamp sfm_max, unlike the rpm/feed/doc factors). [scrutiny P1]
export const SFM_MIN = 20;    // ft/min
export const SFM_MAX_CAP = 3000; // ft/min

/** Clamp a multiplier factor to the sane band; undefined if not a usable number. */
function clampFactor(x) {
  if (typeof x !== "number" || !isFinite(x)) return undefined;
  return Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, x));
}

// QUANTITATIVE-EVIDENCE detectors for the hallucination guard. The model sometimes invents a factor
// from a control-code/feedrate mention ("Use FF2 for setting the feedrate" -> feed_factor 1.2). A real
// relative factor must be backed by a directional CHANGE verb + a number in the tip; an absolute sfm cap
// must be backed by a surface-speed context + a number. [scrutiny finding -- FF2 false-positive]
const CHANGE_VERB_RE = /\b(reduc|increas|decreas|lower|rais|cut|boost|slow|fast|higher|drop|bump|halv|doubl|deeper|shallow)/i;
const SFM_CTX_RE = /\b(sfm|surface\s*speed|ft\/?\s*min|fpm|m\/?\s*min|cutting\s*speed|vc)\b/i;
const NUMBER_RE = /\d/;
/** A relative rpm/feed/doc factor needs a directional change verb + a number in the tip. */
export function hasFactorEvidence(text) {
  return typeof text === "string" && CHANGE_VERB_RE.test(text) && NUMBER_RE.test(text);
}
/** An absolute sfm cap needs a surface-speed context + a number in the tip. */
export function hasSfmEvidence(text) {
  return typeof text === "string" && SFM_CTX_RE.test(text) && NUMBER_RE.test(text);
}

/** Extract the first JSON object from a model response that may wrap it in prose / ``` fences. */
export function extractJsonObject(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

/** factor key -> the affects_parameters name LatheTribalSignal uses. */
const AFFECTS = { rpm_factor: "rpm", feed_factor: "feed", doc_factor: "doc", sfm_max: "rpm" };

/**
 * Parse + validate + clamp a model classification into a LatheTribalSignal, or advisory_only.
 * @param {string|object} raw  model JSON (string or already-parsed)
 * @param {{tip_id?:string, tip_title?:string}} meta
 * @returns {{tip_id?:string, tip_title?:string, advisory_only:boolean, reason?:string,
 *            signal_type?:string, operation_type?:string, material_iso?:string,
 *            affects_parameters?:string[], adjustment?:object, clamped?:boolean}}
 */
export function parseClassification(raw, meta = {}) {
  const base = { tip_id: meta.tip_id, tip_title: meta.tip_title };
  const obj = extractJsonObject(raw);
  if (!obj) return { ...base, advisory_only: true, reason: "unparseable" };
  if (obj.advisory_only === true) return { ...base, advisory_only: true };

  const adjIn = (obj.adjustment && typeof obj.adjustment === "object") ? obj.adjustment : {};
  const adjustment = {};
  // Quantitative-evidence guard: accept a factor/cap ONLY if the tip TEXT actually states the change.
  // When no tipText is supplied (older callers), the guard is inert (backward-compat).
  const tipText = typeof meta.tipText === "string" ? meta.tipText : null;
  const factorOk = tipText === null || hasFactorEvidence(tipText);
  const sfmOk = tipText === null || hasSfmEvidence(tipText);
  for (const k of ["rpm_factor", "feed_factor", "doc_factor"]) {
    const v = clampFactor(adjIn[k]);
    if (v !== undefined && v !== 1 && factorOk) adjustment[k] = v; // 1.0 = no-op; require evidence
  }
  // sfm_max (ft/min): keep ONLY within the plausible band AND when the tip cites a surface speed.
  if (sfmOk && typeof adjIn.sfm_max === "number" && isFinite(adjIn.sfm_max) && adjIn.sfm_max >= SFM_MIN && adjIn.sfm_max <= SFM_MAX_CAP) {
    adjustment.sfm_max = adjIn.sfm_max;
  }
  // No surviving parametric change -> advisory_only (never fabricate an adjustment). [R12]
  if (Object.keys(adjustment).length === 0) return { ...base, advisory_only: true };

  const operation_type = LATHE_OPS.has(obj.operation_type) ? obj.operation_type : undefined;
  const material_iso = MATERIAL_ISO.has(obj.material_iso) ? obj.material_iso : undefined;
  const signal_type = SIGNAL_TYPES.has(obj.signal_type) ? obj.signal_type : "constraint";
  const affects_parameters = [...new Set(Object.keys(adjustment).map((k) => AFFECTS[k]).filter(Boolean))];

  return {
    ...base,
    advisory_only: false,
    signal_type,
    ...(operation_type ? { operation_type } : {}),
    ...(material_iso ? { material_iso } : {}),
    affects_parameters,
    adjustment,
    // confidence + rationale are NON-optional on LatheTribalSignal (the consumer reads rationale into
    // operator warnings + confidence for weighting) -- emit them so the future wiring needs no rework. [scrutiny P1]
    confidence: (typeof meta.confidence === "number" && isFinite(meta.confidence)) ? meta.confidence : 0.5,
    rationale: meta.rationale || meta.tip_title || "tribal-derived signal",
    clamped: true,
  };
}

/** Build the Ollama classification prompt for one tip (used by the runner). */
export function buildClassifyPrompt(tip) {
  return [
    "You are a CNC lathe (turning) process engineer. Classify ONE shop-floor tip into a structured",
    "turning adjustment signal. Output ONLY a JSON object, no prose, no code fences.",
    "",
    `TIP: """${String(tip).slice(0, 600)}"""`,
    "",
    "Schema:",
    `{"operation_type": one of [${[...LATHE_OPS].join(", ")}] or null,`,
    ' "material_iso": one of [P,M,K,N,S,H] or null,',
    ' "signal_type": "positive"|"negative"|"constraint",',
    ' "advisory_only": boolean,',
    ' "adjustment": {"rpm_factor": number|null, "feed_factor": number|null, "doc_factor": number|null, "sfm_max": number|null}}',
    "",
    "Rules: set advisory_only=true when the tip is general advice (tool/insert selection, coating,",
    "holding, safety, surface treatment) with NO quantitative speed/feed/depth change. Factors are",
    "multipliers around 1.0 (0.8 = reduce 20%, 1.2 = increase 20%); set one ONLY when the tip implies",
    "a specific parametric change. sfm_max is an absolute surface-speed cap in ft/min (SFM) if the tip states one.",
  ].join("\n");
}
