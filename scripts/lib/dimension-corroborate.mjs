// scripts/lib/dimension-corroborate.mjs
//
// U-XCSD — cross-source dimension corroboration (pure core).
//
// Goal (operator): "use all JM data — prints + CAD models + CNC programs — to DETERMINE
// dimensions." This fold fuses up to three sources for ONE part into a corroborated
// ground-truth dimension set, so the OCR/print reader can be trained + graded against a
// label that more than one independent source agrees on.
//
// SOURCE MODEL (grounded in the corpus reality, NOT naive):
//   • CAD geometry  → DIMENSIONAL. STEP/BRep gives EXACT nominal values (bbox, hole Ø, depths).
//   • Print OCR     → DIMENSIONAL. What the drawing states (the thing being trained/graded).
//   • CNC G-code    → PRESENCE-ONLY. cnc-ground-truth-lib.mjs deliberately emits feature-KIND
//                     presence, NOT nominals — a raw G-code coordinate is a position, not a
//                     size, and recovering a correct nominal needs full modal-state simulation
//                     (G90/91, canned-cycle R-plane, lathe radius/Ø mode, work datum). Emitting
//                     a G-code "value" as a dimension would POISON the gradient (R12). So CNC
//                     here CORROBORATES that a dimensioned FEATURE was actually machined — it
//                     does not vote on the value.
//
// Dimensional corroboration uses the type-aware scoreDimensionSet (a diameter never agrees with
// a linear/angular of equal magnitude). A dim is:
//   • corroborated — ≥2 dimensional sources agree within tolerance (high-confidence GT).
//   • conflict     — same type, plausibly the same feature, but values disagree beyond tolerance
//                    (an OCR misread or a print↔CAD mismatch to surface, NEVER silently average).
//   • unconfirmed  — only one dimensional source has it (kept, flagged low-trust).
//
// PURE: no fs, no engine calls. The CLI shell loads the per-part source dim-sets (CAD via
// StepImportEngine, print via the trainset GT, CNC presence via buildGtRecordFromNc) and folds.

import { scoreDimensionSet, dimToMm, dimType } from "./dimension-set-score.mjs";

// Feature-kind a dimension type implies, for matching against CNC presence evidence.
// (CNC presence vocabulary: central_oil_hole / cross_drilled_relief_holes / stepped_revolved_axis.)
const DIM_TYPE_TO_FEATURE = Object.freeze({
  diameter: "hole",
  radius: "hole",
  counterbore: "hole",
  countersink: "hole",
  depth: "hole",
  thread: "hole",
});
const HOLE_PRESENCE_KINDS = Object.freeze(["central_oil_hole", "cross_drilled_relief_holes"]);

// Same-type dims that miss the agreement tolerance but fall within this RELATIVE band are treated
// as the SAME feature with a disagreeing value (a conflict to surface), vs genuinely distinct
// features (unconfirmed). 0.30 = 30%: well past the 1% agreement tol, but close enough that two
// readings of the same nominal (e.g. a misread .375 vs .357) pair up rather than look like two holes.
export const DEFAULT_CONFLICT_BAND = 0.30;

function dimsOf(src) {
  if (!src || typeof src !== "object" || !Array.isArray(src.dimensions)) return [];
  // keep only dims with a resolvable mm value + a type (angular/null-mm dims are not length-corroborated)
  return src.dimensions
    .map((d) => ({ type: dimType(d) || "unknown", nominal_mm: dimToMm(d) }))
    .filter((d) => d.nominal_mm !== null);
}

/** Pure: within-band relative difference of two positive mm values (0 = identical). */
function relDiff(a, b) {
  const m = Math.max(Math.abs(a), Math.abs(b));
  return m > 0 ? Math.abs(a - b) / m : 0;
}

/**
 * Corroborate one part's dimensions across sources.
 * @param {{print?:object, cad?:object, cnc?:object}} sources
 *   print/cad: { dimensions:[{type,nominal_mm}] }   cnc: { features:[kind,...] } (presence-only)
 * @param {{pct?:number, absMm?:number, conflictBand?:number}} [opts]
 * @returns {object} corroborated GT record (see fields below)
 */
export function corroborate(sources, opts = {}) {
  const s = sources && typeof sources === "object" ? sources : {};
  const conflictBand = Number.isFinite(opts.conflictBand) ? opts.conflictBand : DEFAULT_CONFLICT_BAND;
  const printDims = dimsOf(s.print);
  const cadDims = dimsOf(s.cad);
  const cncFeatures = (s.cnc && Array.isArray(s.cnc.features)) ? s.cnc.features.map((f) => String(f)) : [];
  const cncHasHoleEvidence = cncFeatures.some((f) => HOLE_PRESENCE_KINDS.includes(f));

  const dimensionalSources = [];
  if (s.print) dimensionalSources.push("print");
  if (s.cad) dimensionalSources.push("cad");

  const corroborated = [];   // ≥2 dimensional sources agree
  const conflicts = [];      // same-type, disagree beyond tol but within conflictBand
  const unconfirmed = [];    // single dimensional source

  // CAD is the exact-geometry source → when present, prefer it as the nominal; print confirms it.
  // score orientation: extracted=print, truth=cad → pairs{truth:cad, got:print}, delta=print-cad.
  if (printDims.length && cadDims.length) {
    const score = scoreDimensionSet(printDims, cadDims, opts);
    for (const p of score.pairs) {
      const feat = DIM_TYPE_TO_FEATURE[(p.truth_type || p.got_type || "")] || null;
      corroborated.push({
        type: p.truth_type || p.got_type || "unknown",
        nominal_mm: p.truth,                 // CAD value = the ground-truth nominal (geometry is exact)
        print_mm: p.got, cad_mm: p.truth, delta_mm: p.delta_mm,
        confirmed_by: ["print", "cad"],
        cnc_presence_support: feat === "hole" ? cncHasHoleEvidence : null,
      });
    }
    // residuals: cad_only = score.missed_mm (truth unmatched); print_only = score.extra_mm
    const cadOnly = score.missed_mm.map((mm) => ({ mm, type: typeOfValue(cadDims, mm) }));
    const printOnly = score.extra_mm.map((mm) => ({ mm, type: typeOfValue(printDims, mm) }));
    // conflict pass: pair a cad_only with a print_only of SAME type within conflictBand (same feature, misread)
    const usedPrint = new Set();
    for (const c of cadOnly) {
      let best = -1, bestDiff = Infinity;
      for (let i = 0; i < printOnly.length; i++) {
        if (usedPrint.has(i)) continue;
        const po = printOnly[i];
        if (po.type !== c.type) continue;
        const rd = relDiff(c.mm, po.mm);
        if (rd <= conflictBand && rd < bestDiff) { bestDiff = rd; best = i; }
      }
      if (best >= 0) {
        usedPrint.add(best);
        conflicts.push({ type: c.type, cad_mm: c.mm, print_mm: printOnly[best].mm, delta_mm: +(printOnly[best].mm - c.mm).toFixed(4), rel_diff: +bestDiff.toFixed(4) });
      } else {
        unconfirmed.push({ type: c.type, nominal_mm: c.mm, confirmed_by: ["cad"], reason: "cad_only" });
      }
    }
    printOnly.forEach((po, i) => { if (!usedPrint.has(i)) unconfirmed.push({ type: po.type, nominal_mm: po.mm, confirmed_by: ["print"], reason: "print_only" }); });
  } else {
    // only one dimensional source (or none) → everything is unconfirmed (single-source, low-trust)
    const lone = printDims.length ? { dims: printDims, src: "print" } : (cadDims.length ? { dims: cadDims, src: "cad" } : null);
    if (lone) for (const d of lone.dims) unconfirmed.push({ type: d.type, nominal_mm: d.nominal_mm, confirmed_by: [lone.src], reason: `single_source:${lone.src}` });
  }

  const summary = {
    dimensional_sources: dimensionalSources,
    cnc_presence: cncFeatures,
    n_corroborated: corroborated.length,
    n_conflict: conflicts.length,
    n_unconfirmed: unconfirmed.length,
    // corroboration rate over all distinct dimensional findings (the training-label quality signal)
    total_findings: corroborated.length + conflicts.length + unconfirmed.length,
    corroboration_rate: 0,
  };
  summary.corroboration_rate = summary.total_findings ? +(corroborated.length / summary.total_findings).toFixed(4) : 0;

  return { corroborated, conflicts, unconfirmed, summary };
}

/** Pure: the type of the dim in `dims` whose mm equals `mm` (first match); "unknown" if none. */
function typeOfValue(dims, mm) {
  const hit = dims.find((d) => d.nominal_mm === mm);
  return hit ? hit.type : "unknown";
}

/** Pure: aggregate per-part corroboration records into a corpus roll-up. */
export function aggregateCorroboration(records) {
  const arr = (Array.isArray(records) ? records : []).filter((r) => r && r.summary);
  const acc = { parts: arr.length, corroborated: 0, conflict: 0, unconfirmed: 0, parts_with_conflict: 0, parts_fully_corroborated: 0 };
  for (const r of arr) {
    acc.corroborated += r.summary.n_corroborated;
    acc.conflict += r.summary.n_conflict;
    acc.unconfirmed += r.summary.n_unconfirmed;
    if (r.summary.n_conflict > 0) acc.parts_with_conflict++;
    if (r.summary.n_corroborated > 0 && r.summary.n_conflict === 0 && r.summary.n_unconfirmed === 0) acc.parts_fully_corroborated++;
  }
  const totalFindings = acc.corroborated + acc.conflict + acc.unconfirmed;
  acc.corroboration_rate = totalFindings ? +(acc.corroborated / totalFindings).toFixed(4) : 0;
  return acc;
}
