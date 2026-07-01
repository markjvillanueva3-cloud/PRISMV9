/**
 * cad-dimension-gt-lib.mjs -- pure: derive CALLOUT-CLASS dimensional ground truth from a part's
 * neutral STEP model + score/triangulate OCR dims against it (U-XRAY-CAD-GT-SCORE, slot:xray).
 *
 * WHY (the P2.7 measurement-backbone gap): `validate-perfect-parts.mjs` scores OCR recall against the
 * posted CNC PROGRAM only (`cnc-program-gt-lib.mjs`). On the 91-part `perfect-print-cad-program-parts`
 * corpus that leaves exactly ONE scoreable part (05850) -- 53 parts are `program_not_nc` (binary CAM,
 * no G-code answer key) yet carry a neutral STEP model whose feature geometry is an INDEPENDENT
 * dimensional answer key. This lib turns that STEP geometry into a callout-class GT dim set so those
 * parts become scoreable, and -- where BOTH a program and a CAD model exist -- TRIANGULATES the two
 * into a high-confidence corroborated dim set (the operator's "compare to cad files AND cnc programs
 * to determine if you extracted the correct data").
 *
 * HONESTY (R12, the program-GT lesson at cnc-program-gt-lib.mjs:122-134/213): a STEP model's raw
 * cylindrical radii include MANY features a print never explicitly dimensions (fillets, cosmetic
 * blends, thread-relief arcs) -- using every radius as the recall denominator structurally ceilings
 * recall, the exact artifact that lib documents for roughing-ramp toolpath points. So CAD-GT is:
 *   (1) callout-class FILTERED  -- radii->diameters, drop sub-callout fillet-class (< calloutFloorMm),
 *       CLUSTER within relTol into representative feature diameters (reuse `clusterDiameters`), + the
 *       envelope L/W/H. This is a DIAMETER + ENVELOPE answer key -- NOT a fillet/radius answer key
 *       (small R-callouts are deliberately out of scope; modelling them would re-introduce over-count).
 *   (2) reliability-CLASSIFIED -- a model that is ALL tiny radii (no clustered feature dia AND no sane
 *       envelope) is cadGtClass:'no-callout-geometry' -> gtReliable:false (caller excludes it, exactly
 *       like a contour program); unknown unit -> 'unknown-unit' -> gtReliable:false (never fabricate a
 *       dim in an unknown unit -- the 25.4x trap).
 *   (3) clearly LOWER-confidence than program GT when used ALONE; HIGH-confidence only at the
 *       program (intersect) cad triangulation intersection.
 *
 * RELATIONSHIP TO `CrossSourceDimensionReconciliationEngine` (R7 -- surface, do not duplicate):
 * the canonical multi-source CONSENSUS engine (`mcp-server/src/engines/...`, wired
 * `prism_cad:cad_dimension_reconcile`, commit a57ef19c2d) fuses print+cad+cnc `DimCandidate[]` into
 * consensus dims + flagged conflicts (noisy-OR, confidence-weighted, type-aware tolerance). That
 * engine takes candidates IN; its documented NEXT-ITER gap is the "(b) cad: STEP/solid geometry
 * measure" source-adapter. `extractCadGT` + `cadGtToCandidates` here FILL that gap (the CAD adapter)
 * and compose with -- never replace -- the engine. `triangulateGT` below is a ZERO-DEPENDENCY 2-source
 * corroboration helper for the STANDALONE `.mjs` measurement harness (validate-perfect-parts, no MCP /
 * no TS build) -- for production multi-source consensus use the engine, not this helper.
 *
 * UNITS: every value this lib emits or compares is MILLIMETRES. `extractRadiiMm`/`extractBboxMm`
 * already resolve the per-file STEP unit and normalize. `triangulateGT` converts the program GT's
 * INCH callout set to mm before intersecting. OCR dims fed to the scorer are mm (PRISM internal unit).
 *
 * Pure -> no fs/process; hermetically testable on real STEP text.
 */

import { extractRadiiMm, extractBboxMm } from "./step-dimension-extract.mjs";
import { clusterDiameters } from "./cnc-program-gt-lib.mjs";

const MM_PER_INCH = 25.4;

/**
 * Diameters below this (mm) are treated as fillet / cosmetic-blend class and EXCLUDED from the
 * callout-class GT denominator (over-count guard -- a 0.5 mm radius -> 1.0 mm "diameter" is a fillet
 * a print dimensions with R, not Ø). Conservative default; a genuine sub-1mm hole is rare on JM-Die
 * die/punch parts and excluding it biases toward UNDER-counting GT (the safe direction -- it cannot
 * fabricate a missing-OCR failure). Tunable via opts.calloutFloorMm.
 */
export const CAD_CALLOUT_FLOOR_MM = 1.0;

/** Default fractional gap below which two diameters are the "same" feature (matches program-GT). */
export const CAD_CLUSTER_REL_TOL = 0.03;

/** Default relative tolerance for an OCR dim to "match" a GT dim (matches program-GT scorer). */
export const CAD_MATCH_REL_TOL = 0.02;

/**
 * Pure: derive a CALLOUT-CLASS dimensional GT set from a neutral STEP file's text.
 *
 * Radii (mm) -> diameters (x2) -> drop sub-floor fillet-class -> CLUSTER within relTol into
 * representative feature diameters; plus the axis-aligned envelope [L,W,H]. The recall denominator
 * the caller scores against is `calloutDimsMm` = featureDiametersMm + envelopeMm.
 *
 * @param {string} stepText  neutral STEP file content
 * @param {{calloutFloorMm?:number, clusterRelTol?:number}} [opts]
 * @returns {{
 *   unit:string, scaleResolved:boolean,
 *   featureDiametersMm:number[], envelopeMm:number[], calloutDimsMm:number[],
 *   rawRadiiCount:number, rawDiameterCount:number, calloutDiameterCount:number,
 *   cadGtClass:('ok'|'unknown-unit'|'no-callout-geometry'), gtReliable:boolean }}
 */
export function extractCadGT(stepText, opts = {}) {
  const floor = Number.isFinite(opts.calloutFloorMm) ? opts.calloutFloorMm : CAD_CALLOUT_FLOOR_MM;
  const relTol = Number.isFinite(opts.clusterRelTol) ? opts.clusterRelTol : CAD_CLUSTER_REL_TOL;

  const { unit, scaleToMm, radiiMm } = extractRadiiMm(stepText);
  const bbox = extractBboxMm(stepText); // null on unknown unit OR < 2 points

  // Unknown unit -> never fabricate a dim (25.4x trap). extractRadiiMm returns radiiMm:[] and
  // extractBboxMm returns null in this case, so both denominators are empty regardless; flag explicitly.
  if (scaleToMm == null) {
    return {
      unit, scaleResolved: false,
      featureDiametersMm: [], envelopeMm: [], calloutDimsMm: [],
      rawRadiiCount: 0, rawDiameterCount: 0, calloutDiameterCount: 0,
      cadGtClass: "unknown-unit", gtReliable: false,
    };
  }

  // radii -> diameters, drop degenerate + sub-callout fillet-class, then cluster roughing-style noise.
  const rawDiameters = radiiMm
    .filter((r) => Number.isFinite(r) && r > 0)
    .map((r) => r * 2);
  const aboveFloor = rawDiameters.filter((d) => d >= floor).sort((a, b) => a - b);
  const featureDiametersMm = clusterDiameters(aboveFloor, relTol).map((d) => +d.toFixed(3));

  // Envelope: drop a degenerate (planar) bbox -- a real machined solid has thickness in every axis.
  // bbox.dims is [L,W,H] descending; the smallest (dims[2]) being ~0 means only coplanar vertices
  // were parsed (mirrors bboxStats's MIN_PART_DIM_MM guard).
  const envelopeMm =
    bbox && Array.isArray(bbox.dims) && bbox.dims.length === 3 && bbox.dims[2] >= 0.05
      ? bbox.dims.map((d) => +d.toFixed(3))
      : [];

  const calloutDimsMm = [...featureDiametersMm, ...envelopeMm];
  const cadGtClass = calloutDimsMm.length > 0 ? "ok" : "no-callout-geometry";

  return {
    unit, scaleResolved: true,
    featureDiametersMm, envelopeMm, calloutDimsMm,
    rawRadiiCount: radiiMm.length,
    rawDiameterCount: rawDiameters.length,
    calloutDiameterCount: featureDiametersMm.length,
    cadGtClass,
    gtReliable: cadGtClass === "ok",
  };
}

/**
 * Pure: does an OCR'd dimension (mm) match ANY GT value (mm) within relTol? Returns the best match.
 * mm-vs-mm -- NO unit conversion (the CAD-GT contract is already mm; do not double-convert).
 * @param {number} dimMm
 * @param {number[]} gtMm
 * @param {{relTol?:number}} [opts]
 * @returns {{matched:boolean, gtMm:(number|null), relErr:(number|null)}}
 */
export function dimMatchesCadGT(dimMm, gtMm, opts = {}) {
  const relTol = Number.isFinite(opts.relTol) ? opts.relTol : CAD_MATCH_REL_TOL;
  if (!Number.isFinite(dimMm) || dimMm <= 0 || !Array.isArray(gtMm)) {
    return { matched: false, gtMm: null, relErr: null };
  }
  let best = null;
  for (const g of gtMm) {
    if (!Number.isFinite(g) || g <= 0) continue;
    const relErr = Math.abs(dimMm - g) / g;
    if (best === null || relErr < best.relErr) best = { gtMm: +g.toFixed(4), relErr: +relErr.toFixed(5) };
  }
  if (!best) return { matched: false, gtMm: null, relErr: null };
  return { matched: best.relErr <= relTol, gtMm: best.gtMm, relErr: best.relErr };
}

/**
 * Pure: score one part's OCR dims (mm) against its CAD-derived callout-class GT (mm). Mirrors
 * `scorePartAgainstProgram` -- recall = fraction of GT dims corroborated by SOME OCR dim; precision =
 * fraction of OCR dims that match SOME GT dim. "Did the OCR read the diameters + envelope the CAD
 * model carries?" Distinct GT values are de-duped (rounded to .001 mm) so a repeated feature is one
 * denominator slot.
 * @param {number[]} ocrDimsMm
 * @param {object} cadGT  from extractCadGT (uses .calloutDimsMm)
 * @param {{relTol?:number}} [opts]
 * @returns {{gtCount:number, gtMatched:number, recall:number, ocrCount:number, ocrMatched:number,
 *            precision:number, matchedPairs:Array}}
 */
export function scorePartAgainstCadGT(ocrDimsMm, cadGT, opts = {}) {
  const relTol = Number.isFinite(opts.relTol) ? opts.relTol : CAD_MATCH_REL_TOL;
  const ocr = (Array.isArray(ocrDimsMm) ? ocrDimsMm : []).filter((d) => Number.isFinite(d) && d > 0);
  const gtRaw = cadGT && Array.isArray(cadGT.calloutDimsMm) ? cadGT.calloutDimsMm : [];
  const gtDistinct = [...new Set(gtRaw.map((v) => +v.toFixed(3)))].filter((v) => v > 0);

  let gtMatched = 0;
  for (const g of gtDistinct) {
    if (ocr.some((d) => Math.abs(d - g) / g <= relTol)) gtMatched++;
  }
  const matchedPairs = [];
  let ocrMatched = 0;
  for (const d of ocr) {
    const mr = dimMatchesCadGT(d, gtDistinct, { relTol });
    if (mr.matched) { ocrMatched++; matchedPairs.push({ ocrMm: +d.toFixed(4), gtMm: mr.gtMm, relErr: mr.relErr }); }
  }
  return {
    gtCount: gtDistinct.length,
    gtMatched,
    recall: gtDistinct.length ? +(gtMatched / gtDistinct.length).toFixed(4) : 0,
    ocrCount: ocr.length,
    ocrMatched,
    precision: ocr.length ? +(ocrMatched / ocr.length).toFixed(4) : 0,
    matchedPairs: matchedPairs.slice(0, 20),
  };
}

/**
 * Pure: adapt a `cadGT` (from extractCadGT) into `DimCandidate[]` for the canonical
 * `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`). This is the
 * documented-missing "(b) cad: STEP/solid geometry measure" source-adapter -- so the CAD GT this lib
 * derives can feed the production consensus engine, not just the standalone harness. Feature diameters
 * are `type:"diameter"`; envelope extents are `type:"linear"` (the engine's canonical linear token --
 * its DimType union has NO "length", and it clusters by EXACT type string, so a wrong token would
 * silently never co-cluster with a print's "linear" overall-length dim). Envelope extents carry
 * canonical feature labels (overall_length/width/height, from the [L,W,H]-descending order) so the
 * engine's cross-source conflict detection (which only fires on labeled dims) can associate them;
 * feature diameters stay unlabeled (genuinely ambiguous -- N distinct holes/bores of unknown identity).
 * `source:"cad"`; confidence defaults to the engine's CAD prior (0.95) for an `ok`-class model, 0.5 for
 * a non-reliable class.
 * @param {object} cadGT  from extractCadGT
 * @param {{confidence?:number, label?:string}} [opts]  opts.label overrides ALL per-candidate labels
 * @returns {Array<{value_mm:number, type:string, source:string, confidence:number, label?:string}>}
 */
export const CAD_ENVELOPE_LABELS = Object.freeze(["overall_length", "width", "height"]);

export function cadGtToCandidates(cadGT, opts = {}) {
  if (!cadGT || !Array.isArray(cadGT.calloutDimsMm)) return [];
  const conf = Number.isFinite(opts.confidence)
    ? opts.confidence
    : (cadGT.gtReliable ? 0.95 : 0.5);
  const diam = Array.isArray(cadGT.featureDiametersMm) ? cadGT.featureDiametersMm : [];
  const env = Array.isArray(cadGT.envelopeMm) ? cadGT.envelopeMm : [];
  const mk = (value_mm, type, defaultLabel) => {
    const c = { value_mm, type, source: "cad", confidence: conf };
    const label = opts.label || defaultLabel; // caller override wins; else the canonical feature label
    if (label) c.label = label;
    return c;
  };
  return [
    ...diam.filter((v) => Number.isFinite(v) && v > 0).map((v) => mk(v, "diameter")),
    // index-preserving so a dropped extent never misaligns the L/W/H labels.
    ...env
      .map((v, i) => ({ v, label: CAD_ENVELOPE_LABELS[i] }))
      .filter((o) => Number.isFinite(o.v) && o.v > 0)
      .map((o) => mk(o.v, "linear", o.label)),
  ];
}

/**
 * Pure: TRIANGULATE program GT and CAD GT into a corroborated, high-confidence dimensional answer key.
 * ZERO-DEPENDENCY 2-source helper for the standalone measurement harness ONLY -- the canonical
 * production multi-source consensus (3-source noisy-OR + conflict-flagging) is
 * `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`); use that when MCP
 * is available. A dimension that BOTH the posted program AND the CAD model carry (within relTol) is
 * independently confirmed -- the strongest GT the harness can derive without an operator label.
 * Program callout dims are INCH (`programGT.calloutDimsIn`); CAD dims are mm (`cadGT.calloutDimsMm`).
 * Both are normalized to mm.
 *
 * The intersection is greedy-1:1 (each program dim consumes at most one CAD dim) so a repeated value
 * cannot inflate the corroborated count.
 *
 * @param {{programGT?:object, cadGT?:object}} sources
 * @param {{relTol?:number}} [opts]
 * @returns {{corroboratedMm:number[], programOnlyMm:number[], cadOnlyMm:number[],
 *            nCorroborated:number, nProgram:number, nCad:number,
 *            confidence:('high'|'uncorroborated'|'program-only'|'cad-only'|'none')}}
 *   confidence: 'high' = >=1 dim in BOTH; 'uncorroborated' = both sources present but ZERO overlap
 *   (a real signal -- they disagree, distinct from no-data); 'program-only'/'cad-only' = one source;
 *   'none' = neither source has dims.
 */
export function triangulateGT(sources = {}, opts = {}) {
  const relTol = Number.isFinite(opts.relTol) ? opts.relTol : CAD_MATCH_REL_TOL;
  const pg = sources.programGT;
  const cg = sources.cadGT;

  const programMm = pg && Array.isArray(pg.calloutDimsIn)
    ? [...new Set(pg.calloutDimsIn.map((v) => +(Math.abs(v) * MM_PER_INCH).toFixed(3)))].filter((v) => v > 0)
    : [];
  const cadMm = cg && Array.isArray(cg.calloutDimsMm)
    ? [...new Set(cg.calloutDimsMm.map((v) => +v.toFixed(3)))].filter((v) => v > 0)
    : [];

  const cadAvailable = cadMm.map((v) => ({ v, used: false }));
  const corroboratedMm = [];
  const programOnlyMm = [];
  for (const p of programMm) {
    let hit = null;
    for (const c of cadAvailable) {
      if (c.used) continue;
      const relErr = Math.abs(p - c.v) / c.v;
      if (relErr <= relTol && (hit === null || relErr < hit.relErr)) hit = { c, relErr };
    }
    if (hit) { hit.c.used = true; corroboratedMm.push(p); }
    else programOnlyMm.push(p);
  }
  const cadOnlyMm = cadAvailable.filter((c) => !c.used).map((c) => c.v);

  let confidence;
  if (corroboratedMm.length > 0) confidence = "high";
  else if (programMm.length > 0 && cadMm.length > 0) confidence = "uncorroborated"; // both present, 0 overlap
  else if (programMm.length > 0) confidence = "program-only";
  else if (cadMm.length > 0) confidence = "cad-only";
  else confidence = "none";

  return {
    corroboratedMm,
    programOnlyMm,
    cadOnlyMm,
    nCorroborated: corroboratedMm.length,
    nProgram: programMm.length,
    nCad: cadMm.length,
    confidence,
  };
}
