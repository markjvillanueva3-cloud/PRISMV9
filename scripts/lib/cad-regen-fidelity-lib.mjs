/**
 * scripts/lib/cad-regen-fidelity-lib.mjs -- pure core of the CAD regen-fidelity runner (slot:delta).
 *
 * THE GOAL (T3 geometry half, honest scope per the 2026-06-26 recon).
 *   A TRUE NURBS regen-fidelity run (re-emit a blisk-class B_SPLINE_SURFACE net) is MERGE-GATED --
 *   no surface emitter exists on trunk or in slot/delta. What IS achievable headless on trunk is a
 *   PRISMATIC dimensional-fidelity + SELF-CONSISTENCY run over the 240 cadquery-generated STEPs, plus
 *   reference-corpus measurement. This file holds the PURE math/parse; the .mts driver does the I/O
 *   (cadGeometryComparisonEngine.extractMetrics/compare) + writes CAD-TRAIN-TEST-RESULT.
 *
 * PURE: no I/O, no Date.now. Fully node:test-able.
 *
 * Karpathy discipline:
 *   CLASSIFY: parse (NL spec -> intended bbox) + transform (sorted dim-delta) + validate (band gate).
 *   TECHNIQUE: orientation-invariant comparison via SORTED dimension sets (a cylinder's bbox axes can
 *     land on any of x/y/z, so element-wise-after-sort is the only correct compare).
 *   EDGE CASES: compound/ambiguous spec -> parsed:false (NEVER guess a wrong intent); zero/negative
 *     intended dim -> skip that dim; empty parts -> 0 pass-rate, not a throw.
 *   FAILURE MODES: a spec we cannot parse confidently degrades to self-consistency-only (honest),
 *     it does not fabricate a dimensional pass.
 *
 * @module scripts/lib/cad-regen-fidelity-lib
 */

/** Canonical inch->mm (the DEFINITION of an inch; STEP CONVERSION_BASED_UNIT 0.0254 m). Not a material constant. */
export const INCH_TO_MM = 25.4;

/** Default fidelity band (operator-tunable) -- grounded in the proven blisk closed-loop result. */
export const DEFAULT_BAND = Object.freeze({ meanDeltaPct: 2, worstDeltaPct: 6 });

const NUM = "([0-9]*\\.?[0-9]+)";
const reBefore = (word) => new RegExp(`${NUM}\\s*inch(?:es)?\\s+${word}`, "i");
const RE_CUBE = reBefore("(?:cube|square)");
const RE_DIAM = reBefore("diameter");
const RE_LEN = reBefore("(?:tall|long|thick|high|deep)");

/**
 * Conservatively parse a natural-language part spec into an intended bounding box (inches).
 * Only CLEAN archetypes are parsed; compound/ambiguous specs return {parsed:false} so the runner
 * falls back to self-consistency-only rather than fabricate a wrong dimensional intent (R12).
 *
 * Handled: "<s> inch cube/square" -> [s,s,s] (a through-hole does NOT change the cube bbox);
 *          "<D> inch diameter ... <L> inch tall/long/thick/high" -> [D,D,L] (cylinder/shaft/disc).
 * Rejected: compound parts ("... on a ...", a 2nd diameter), no recognizable archetype.
 *
 * @param {string} request the NL spec (request.json.request)
 * @returns {{parsed:true, archetype:string, dimsInch:number[]} | {parsed:false, reason:string}}
 */
export function parseInchesFromSpec(request) {
  const s = String(request || "").toLowerCase().trim();
  if (!s) return { parsed: false, reason: "empty-spec" };

  // Compound parts ("flange ... on a shaft", "mounted on", "attached to") are ambiguous -> reject.
  if (/\bon a\b|\bonto\b|\bmounted\b|\battached\b|\bwith a .* (?:shaft|flange|boss|step)\b/.test(s)) {
    return { parsed: false, reason: "compound-part" };
  }

  // Plate: "<X> inch square plate <T> inch thick" -> [X,X,T]. Checked BEFORE cube (a plate contains
  // "square"). Planar, but `bboxMeasurable:false` pending a square-plate measured anomaly (cadquery may
  // emit a different Z extent; needs deeper triage) -- excluded from the dim band, kept for determinism.
  if (/\bplate\b/.test(s)) {
    const sideM = s.match(RE_CUBE);
    const thickM = s.match(reBefore("thick"));
    if (sideM && thickM) {
      const side = Number(sideM[1]);
      const thick = Number(thickM[1]);
      if (side > 0 && thick > 0) return { parsed: true, archetype: "plate", dimsInch: [side, side, thick], bboxMeasurable: false };
    }
    return { parsed: false, reason: "plate-unparsed" };
  }

  // Cube: all 8 corners are CARTESIAN_POINTs, so extractMetrics' point-cloud bbox is EXACT
  // (`bboxMeasurable:true`). A through-hole leaves the bbox unchanged.
  if (/\bcube\b/.test(s)) {
    const m = s.match(RE_CUBE);
    if (m) {
      const side = Number(m[1]);
      if (Number.isFinite(side) && side > 0) return { parsed: true, archetype: "cube", dimsInch: [side, side, side], bboxMeasurable: true };
    }
    return { parsed: false, reason: "cube-no-side" };
  }

  // Rectangular block / bar: "<X> inch by <Y> inch by <Z> inch [rectangular block/bar]". All-planar
  // (every corner is a CARTESIAN_POINT) so the point-cloud bbox is EXACT (`bboxMeasurable:true`).
  // Distinct from a cylinder ("diameter by ... tall") -- requires NO "diameter" + exactly 3 inch dims.
  if (!/diameter/.test(s) && /\binch(?:es)?\s+by\b/.test(s)) {
    const nums = [...s.matchAll(new RegExp(`${NUM}\\s*inch(?:es)?`, "gi"))].map((m) => Number(m[1])).filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length === 3) return { parsed: true, archetype: "block", dimsInch: nums, bboxMeasurable: true };
    return { parsed: false, reason: `block expected 3 dims, found ${nums.length}` };
  }

  // Cylinder / shaft / disc: diameter + a single length word. `bboxMeasurable:false` -- a circular
  // extent is a CIRCLE entity (center+radius), NOT a CARTESIAN_POINT cloud, so extractMetrics
  // UNDER-measures the diameter (a cylinder reads bbox ~[radius, 0, length]). The intent is recorded
  // for transparency but the dim band is NOT evaluated on curved parts (would be a false failure).
  if (/\b(?:cylinder|shaft|disc|disk|rod|cylindrical)\b/.test(s) || (/diameter/.test(s) && RE_LEN.test(s))) {
    const diamMatches = [...s.matchAll(new RegExp(RE_DIAM.source, "gi"))];
    if (diamMatches.length !== 1) return { parsed: false, reason: `expected 1 diameter, found ${diamMatches.length}` };
    const lenMatches = [...s.matchAll(new RegExp(RE_LEN.source, "gi"))];
    if (lenMatches.length !== 1) return { parsed: false, reason: `expected 1 length, found ${lenMatches.length}` };
    const d = Number(diamMatches[0][1]);
    const l = Number(lenMatches[0][1]);
    if (Number.isFinite(d) && d > 0 && Number.isFinite(l) && l > 0) {
      return { parsed: true, archetype: "cylinder", dimsInch: [d, d, l], bboxMeasurable: false };
    }
    return { parsed: false, reason: "diameter/length not finite-positive" };
  }

  return { parsed: false, reason: "no-recognized-archetype" };
}

/**
 * Orientation-invariant dimensional fidelity: sort both dimension triples ascending and compare
 * element-wise. (A part's bbox axes can land on any of x/y/z, so axis-by-axis is wrong; sorted is right.)
 *
 * @param {number[]} intendedMm intended bbox dims (mm)
 * @param {number[]} measuredMm measured bbox dims (mm)
 * @returns {{perDimDeltaPct:number[], meanDeltaPct:number, worstDeltaPct:number, ok:boolean}}
 */
export function dimFidelity(intendedMm, measuredMm) {
  const a = (Array.isArray(intendedMm) ? intendedMm : []).map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => x - y);
  const b = (Array.isArray(measuredMm) ? measuredMm : []).map(Number).filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (a.length === 0 || a.length !== b.length) {
    return { perDimDeltaPct: [], meanDeltaPct: NaN, worstDeltaPct: NaN, ok: false };
  }
  const perDimDeltaPct = a.map((intended, i) => (Math.abs(b[i] - intended) / intended) * 100);
  const meanDeltaPct = perDimDeltaPct.reduce((s, v) => s + v, 0) / perDimDeltaPct.length;
  const worstDeltaPct = Math.max(...perDimDeltaPct);
  return { perDimDeltaPct, meanDeltaPct, worstDeltaPct, ok: true };
}

/**
 * A part PASSES the dimensional band iff mean<=meanBand AND worst<=worstBand AND determinism held
 * (compare(step,step) overallPassed -- the measurement+compare pipeline is self-consistent).
 *
 * @param {{meanDeltaPct:number, worstDeltaPct:number}} fid
 * @param {boolean} determinismPassed
 * @param {{meanDeltaPct:number, worstDeltaPct:number}} [band]
 * @returns {boolean}
 */
export function bandPass(fid, determinismPassed, band = DEFAULT_BAND) {
  if (!determinismPassed) return false;
  if (!fid || !Number.isFinite(fid.meanDeltaPct) || !Number.isFinite(fid.worstDeltaPct)) return false;
  return fid.meanDeltaPct <= band.meanDeltaPct && fid.worstDeltaPct <= band.worstDeltaPct;
}

/**
 * Aggregate per-part self-consistency results into the run verdict.
 *
 * @param {Array<{intentParsed:boolean, passed:boolean, fid?:{meanDeltaPct:number, worstDeltaPct:number}, determinismPassed:boolean}>} parts
 * @returns {object} aggregate
 */
export function aggregate(parts) {
  const list = Array.isArray(parts) ? parts : [];
  const total = list.length;
  const determinismOk = list.filter((p) => p.determinismPassed).length;
  // Restrict the dim aggregation to determinism-PASSING parts so the headline mean/worst/bandMet are
  // consistent with dimBandPassRate (which gates on `passed`, i.e. bandPass -> requires determinism).
  const dimParts = list.filter((p) => p.intentParsed && p.determinismPassed && p.fid && Number.isFinite(p.fid.meanDeltaPct));
  const passed = list.filter((p) => p.passed).length;
  const dimMeans = dimParts.map((p) => p.fid.meanDeltaPct);
  const dimWorsts = dimParts.map((p) => p.fid.worstDeltaPct);
  const meanDimDeltaPct = dimMeans.length ? +(dimMeans.reduce((s, v) => s + v, 0) / dimMeans.length).toFixed(4) : null;
  const worstDimDeltaPct = dimWorsts.length ? +Math.max(...dimWorsts).toFixed(4) : null;
  return {
    total,
    determinismPassRate: total ? +(determinismOk / total).toFixed(4) : 0,
    dimEvaluatedParts: dimParts.length,
    dimBandPassParts: dimParts.filter((p) => p.passed).length,
    dimBandPassRate: dimParts.length ? +(dimParts.filter((p) => p.passed).length / dimParts.length).toFixed(4) : null,
    overallPassedParts: passed,
    meanDimDeltaPct,
    worstDimDeltaPct,
    bandMet: meanDimDeltaPct !== null && worstDimDeltaPct !== null && meanDimDeltaPct <= DEFAULT_BAND.meanDeltaPct && worstDimDeltaPct <= DEFAULT_BAND.worstDeltaPct,
  };
}

/**
 * Lowercased-basename Set of topologically-INVALID reference parts, derived from a corpus topology-audit
 * report's `invalidPaths` (scripts/cad-corpus-topology-audit.mjs --write). PURE (no I/O) so it is
 * node:test-able. A topologically-broken reference (non-manifold / self-intersecting / open shell) is
 * MEANINGLESS ground truth -- measuring a generated part against it pollutes referenceMeasurement -- so the
 * regen-fidelity runner drops these from its reference set (and reclaims the cap slot for a valid part).
 * Matches on basename (case-insensitive): the report stores Windows abs paths
 * ("H:\\PRISM\\resources\\CAD FILES\\Body 1.step") whose path-case + separators differ from the runner's
 * REF_DIR join, but the basename is unique within the single scanned dir. Splits on BOTH separators (a
 * POSIX path parser would not split the report's backslashes) and keeps only real .step/.stp basenames.
 */
export function invalidRefBasenameSet(invalidPaths) {
  if (!Array.isArray(invalidPaths)) return new Set();
  return new Set(
    invalidPaths
      .map((p) => String(p).split(/[\\/]/).pop())
      .filter((b) => b && /\.(step|stp)$/i.test(b))
      .map((b) => b.toLowerCase()),
  );
}
