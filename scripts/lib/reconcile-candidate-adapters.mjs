/**
 * reconcile-candidate-adapters.mjs -- the SOURCE-ADAPTER trio feeding `DimCandidate[]` to
 * `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`, commit a57ef19c2d).
 *
 * WHY: that engine fuses print+cad+cnc dimension candidates into consensus dims + flagged conflicts,
 * but it takes candidates IN -- its documented NEXT-ITER is "build 3 thin source-adapters feeding
 * DimCandidate[] -- (a) print: OCR store, (b) cad: STEP geometry measure, (c) cnc: G-code". This
 * module completes that trio: `cadGtToCandidates` already lives in cad-dimension-gt-lib (the (b)
 * adapter); here are the (c) cnc and (a) print adapters + a `buildPartCandidates` merger. Pure -> no
 * I/O; the engine performs the actual consensus.
 *
 * DimCandidate (engine contract): {value_mm:number, type:DimType, source:'print'|'cad'|'cnc',
 *   confidence?:number, label?:string}. DimType = linear|diameter|radius|angular|depth|chamfer|thread|
 *   counterbore|countersink|unknown. Confidence is OPTIONAL -- the engine falls back to its per-source
 *   PRIOR ({cad:0.95, cnc:0.90, print:0.70}) when absent, so we OMIT it where we have no calibrated
 *   per-candidate signal (program GT is machined truth with no per-dim confidence) rather than
 *   re-inlining the engine's prior (single source of truth, R8).
 */

import { cadGtToCandidates } from "./cad-dimension-gt-lib.mjs";

const MM_PER_INCH = 25.4;

export { cadGtToCandidates };

/**
 * (c) cnc adapter: a program GT (from cnc-program-gt-lib extractProgramGT / extractMillProgramGT) ->
 * DimCandidate[]. Clustered feed-move diameters (INCH) -> mm, typed `diameter`; the overall feed-Z
 * length -> `linear` labeled `overall_length`. Confidence is OMITTED (machined GT has no per-dim
 * confidence; the engine applies its cnc prior 0.90) unless opts.confidence is given.
 * @param {object} programGT  uses .clusteredDiametersIn (fallback .calloutDimsIn) + .lengthIn
 * @param {{confidence?:number}} [opts]
 * @returns {Array<{value_mm:number, type:string, source:string, confidence?:number, label?:string}>}
 */
export function programGtToCandidates(programGT, opts = {}) {
  if (!programGT || typeof programGT !== "object") return [];
  const setConf = Number.isFinite(opts.confidence);
  const mk = (value_mm, type, label) => {
    const c = { value_mm: +value_mm.toFixed(3), type, source: "cnc" };
    if (setConf) c.confidence = opts.confidence;
    if (label) c.label = label;
    return c;
  };
  // Prefer the clustered (roughing-ramp-collapsed ~callout-class) diameters; fall back to the raw
  // callout set. lengthIn is excluded from this list (added separately as a linear extent below).
  const diamsIn = Array.isArray(programGT.clusteredDiametersIn) && programGT.clusteredDiametersIn.length
    ? programGT.clusteredDiametersIn
    : (Array.isArray(programGT.featureDiametersIn) ? programGT.featureDiametersIn : []);
  const out = [];
  for (const d of diamsIn) {
    // The producer (extractProgramGT) already abs's feed-X to a POSITIVE diameter set + filters >0, so
    // reject any non-positive input as garbage -- NEVER abs it into a fabricated dimension (R12).
    const dn = Number(d);
    if (!Number.isFinite(dn) || dn <= 0) continue;
    out.push(mk(dn * MM_PER_INCH, "diameter"));
  }
  if (Number.isFinite(programGT.lengthIn) && programGT.lengthIn > 0) {
    out.push(mk(programGT.lengthIn * MM_PER_INCH, "linear", "overall_length"));
  }
  return out;
}

/**
 * (a) print adapter: OCR'd dimensions -> DimCandidate[]. Accepts EITHER the contract dim shape
 * [{value_mm, type, confidence}] (carries the real per-field OCR confidence) OR bare mm numbers (no
 * confidence -> engine applies its print prior 0.70). value_mm must be finite + positive.
 * @param {Array<number|{value_mm:number,type?:string,confidence?:number}>} dims
 * @param {{confidence?:number}} [opts]
 * @returns {Array<{value_mm:number, type:string, source:string, confidence?:number}>}
 */
export function printOcrToCandidates(dims, opts = {}) {
  const setConf = Number.isFinite(opts.confidence);
  return (Array.isArray(dims) ? dims : [])
    .map((d) => {
      if (typeof d === "number") {
        if (!Number.isFinite(d) || d <= 0) return null;
        const c = { value_mm: d, type: "unknown", source: "print" };
        if (setConf) c.confidence = opts.confidence;
        return c;
      }
      const v = Number(d && d.value_mm);
      if (!Number.isFinite(v) || v <= 0) return null;
      const c = { value_mm: v, type: typeof d.type === "string" ? d.type : "unknown", source: "print" };
      if (Number.isFinite(d.confidence)) c.confidence = d.confidence;
      else if (setConf) c.confidence = opts.confidence;
      return c;
    })
    .filter(Boolean);
}

/**
 * Merge every available source's candidates for ONE part into a single DimCandidate[] ready for
 * `CrossSourceDimensionReconciliationEngine.reconcile()`. Sources are independent -- pass only what you
 * have (cad+cnc on the GPU-free triangulation path; +print after OCR).
 * @param {{cadGT?:object, programGT?:object, ocrDimsMm?:Array}} sources
 * @param {{cad?:object, program?:object, print?:object}} [opts]  per-source adapter opts
 * @returns {Array<object>}  DimCandidate[]
 */
export function buildPartCandidates(sources = {}, opts = {}) {
  const out = [];
  if (sources.cadGT) out.push(...cadGtToCandidates(sources.cadGT, opts.cad));
  if (sources.programGT) out.push(...programGtToCandidates(sources.programGT, opts.program));
  if (sources.ocrDimsMm) out.push(...printOcrToCandidates(sources.ocrDimsMm, opts.print));
  return out;
}
