#!/usr/bin/env node
/**
 * cad-print-dims.mjs (U-DELTA-CAD-PRINT-DIMS, slot:delta 2026-06-29)
 *
 * The ADAPTER glue between the real data sources and the pure print-comparison core (cad-print-dim-match.mjs).
 * `scorePrintMatch` consumes a canonical `PrintDim[]` (`{type, nominal(mm), view?, tolPlus?, tolMinus?}`); nothing
 * yet PRODUCES that shape from (a) an OCR'd original print or (b) a generated part's geometry. This builds both:
 *   - dimsFromVisionExtraction(extraction) -- the OCR extractor output (ollama-vision-extract-lib.mjs:
 *     `{type:linear|diameter|radius|angular|chamfer|depth|thread|counterbore|countersink, nominal, unit,
 *       tolerance_type, tolerance_upper, tolerance_lower}`) -> canonical PrintDim[] in MM.  This is the
 *     ORIGINAL-print side of both Stage-0 (2D-sketch self-check) and Stage-1 (print-regen compare).
 *   - dimsFromPartSpec(spec) -- a GENERATED part's known geometry (`{bboxMm:[L,W,H], holes:[{diameterMm}],
 *     radiiMm:[...]}`) -> the SAME canonical PrintDim[].  The GENERATED side.
 *
 * UNITS-FIRST (25.4x safety): the OCR adapter resolves each dim's drawn unit -> mm via the CANONICAL
 * `convertToMm` (imported, single-sourced -- NEVER re-implemented). A dim whose unit cannot be resolved is
 * SURFACED in `dropped`, never silently coerced (delta soul: don't drop/guess PMI). dimsFromPartSpec assumes
 * its input is ALREADY mm (the kernel/Fusion bbox is mm) -- the caller must have resolved units upstream.
 *
 * Pure + exported + unit-tested. No Date/random. Both sides emit the SAME canonical type vocabulary so the
 * scorer's type-equality matching works across the OCR<->generated boundary.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertToMm } from "./lib/ollama-vision-extract-lib.mjs";

// Canonical PrintDim type vocabulary. Both adapters map onto THIS set so scorePrintMatch's type-equality holds.
// The OCR extractor's "linear" and "angular" are normalized; every other extractor type passes through.
const EXTRACTOR_TYPE_TO_CANON = {
  linear: "linear", diameter: "diameter", radius: "radius", angular: "angle",
  chamfer: "chamfer", depth: "depth", thread: "thread", counterbore: "counterbore", countersink: "countersink",
};
// Tolerance types whose tolerance_upper/lower are DEVIATIONS from nominal (-> a real band). "limit" is absolute
// limits not deviations, "basic"/"reference" are untoleranced -> no band (the scorer falls back to relTol).
const DEVIATION_TOL_TYPES = new Set(["bilateral", "unilateral_plus", "unilateral_minus"]);

/** Canonicalize an extractor dimension type; unknown -> the lowercased raw (kept, never dropped). */
export function canonType(rawType) {
  const t = String(rawType || "").toLowerCase().trim();
  return EXTRACTOR_TYPE_TO_CANON[t] || t || "linear";
}

/**
 * Convert an OCR vision-extraction result into canonical PrintDim[] (mm). Returns { dims, dropped } where
 * `dropped` lists dims whose UNIT could not be resolved (surfaced, not silently coerced -- units-first safety).
 * `assumeUnits` ("in"|"mm") is the print's title-block default applied ONLY when a dim has no own unit. Pure.
 */
export function dimsFromVisionExtraction(extraction, { assumeUnits = null } = {}) {
  const raw = Array.isArray(extraction?.dimensions) ? extraction.dimensions
    : Array.isArray(extraction) ? extraction : [];
  const dims = [];
  const dropped = [];
  for (const d of raw) {
    if (!d || d.nominal == null) continue;
    const conv = convertToMm(d.nominal, d.unit, assumeUnits);
    if (!conv.resolved || conv.mm == null) { dropped.push({ type: canonType(d.type), nominal: d.nominal, unit: d.unit ?? null, reason: "unit-unresolved" }); continue; }
    const out = { type: canonType(d.type), nominal: Math.round(conv.mm * 1e6) / 1e6, view: d.view || d.location_hint || undefined, unitsAssumed: !!conv.assumed };
    // tolerance band: only deviation-type tolerances become a band; convert each deviation by the SAME unit
    if (DEVIATION_TOL_TYPES.has(String(d.tolerance_type || "").toLowerCase())) {
      const up = d.tolerance_upper != null ? convertToMm(d.tolerance_upper, d.unit, assumeUnits) : null;
      const lo = d.tolerance_lower != null ? convertToMm(d.tolerance_lower, d.unit, assumeUnits) : null;
      if (up?.resolved && up.mm != null) out.tolPlus = Math.abs(Math.round(up.mm * 1e6) / 1e6);
      if (lo?.resolved && lo.mm != null) out.tolMinus = Math.abs(Math.round(lo.mm * 1e6) / 1e6);
    }
    dims.push(out);
  }
  return { dims, dropped };
}

/**
 * Convert a GENERATED part's known geometry into canonical PrintDim[] (mm; caller resolved units upstream).
 * spec: { bboxMm:[L,W,H], holes?:[{diameterMm}|number], radiiMm?:[number], view? }. The bbox becomes three
 * "linear" dims, each hole a "diameter" dim, each fillet a "radius" dim -- the same vocabulary the OCR side
 * emits, so scorePrintMatch can match across the OCR<->generated boundary. Pure.
 */
export function dimsFromPartSpec(spec) {
  const out = [];
  const bbox = Array.isArray(spec?.bboxMm) ? spec.bboxMm.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];
  for (const v of bbox) out.push({ type: "linear", nominal: Math.round(v * 1e6) / 1e6 });
  const holes = Array.isArray(spec?.holes) ? spec.holes : [];
  for (const h of holes) {
    const dia = Number(typeof h === "number" ? h : h?.diameterMm ?? h?.diameter ?? h?.dia);
    if (Number.isFinite(dia) && dia > 0) out.push({ type: "diameter", nominal: Math.round(dia * 1e6) / 1e6, view: (typeof h === "object" && h?.view) || undefined });
  }
  const radii = Array.isArray(spec?.radiiMm) ? spec.radiiMm : [];
  for (const r of radii) { const rr = Number(r); if (Number.isFinite(rr) && rr > 0) out.push({ type: "radius", nominal: Math.round(rr * 1e6) / 1e6 }); }
  return out;
}

/**
 * Normalize the circular-dimensioning CONVENTION so a feature dimensioned as DIAMETER (Ø -- holes/bores/ODs on
 * a print) matches the SAME feature dimensioned as RADIUS (R -- fillets, and the STEP/kernel radius literal a
 * generated part exposes). diameter D -> radius D/2 (the tolerance band halves too); a `dimAs:"diameter"` tag
 * preserves the original convention for reporting. Every other dim passes through untouched. diameter = 2*radius
 * is a domain truth, not a heuristic -- without this, a correct hole (radius in the STEP, Ø on the print) reads
 * as a MISSING feature. Apply to BOTH sides before scorePrintMatch. Pure.
 */
export function canonicalizeCircularDims(dims) {
  return (Array.isArray(dims) ? dims : []).map((d) => {
    if (d && String(d.type).toLowerCase() === "diameter" && Number.isFinite(Number(d.nominal))) {
      const out = { ...d, type: "radius", nominal: Math.round((Number(d.nominal) / 2) * 1e6) / 1e6, dimAs: "diameter" };
      if (d.tolPlus != null) out.tolPlus = Math.abs(Number(d.tolPlus)) / 2;
      if (d.tolMinus != null) out.tolMinus = Math.abs(Number(d.tolMinus)) / 2;
      return out;
    }
    return d;
  });
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) {
  // CLI: adapt an OCR extraction JSON (or a part-spec JSON with {bboxMm}) -> canonical PrintDim[] on stdout.
  (async () => {
    const fs = await import("node:fs");
    const args = process.argv.slice(2);
    const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
    const file = get("--in", null);
    const assumeUnits = get("--assume-units", null);
    if (!file) { process.stderr.write("cad-print-dims: --in <extraction-or-spec.json> [--assume-units in|mm] [--spec]\n"); process.exit(2); }
    const raw = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    const result = args.includes("--spec") || raw?.bboxMm ? { dims: dimsFromPartSpec(raw), dropped: [] } : dimsFromVisionExtraction(raw, { assumeUnits });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  })().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
}
