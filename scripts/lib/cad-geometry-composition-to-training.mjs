/**
 * cad-geometry-composition-to-training.mjs -- pure converter: the STEP-corpus per-class GEOMETRIC
 * COMPOSITION (cad-corpus-step-geometry-report.json) -> Alpaca CAD-generation training pairs
 * (U-CAD-GEOM-COMPOSITION, slot:india 2026-06-11). The TOPOLOGY-signal sibling of
 * [[cad-ground-truth-to-training]] (feature presence) and [[cad-correction-to-fix-ledger]] (corrections).
 *
 * WHY: the GT catalogs teach WHICH features a class has (presence-only); they do NOT teach the
 * surface-primitive MIX a class is built from. cad-corpus-step-geometry-report.json already carries,
 * per class (mined from 665 JM-Die STEP files), the counts of cylindrical / toroidal / conical /
 * B-spline surfaces + a simple/medium/complex complexity histogram -- a quantitative topology prior
 * that was unused by training. This converts it: "a <class> part averages ~N cylindrical, ~M conical,
 * ~K freeform surfaces; complexity X% simple ...". A genuine step beyond presence toward geometric
 * fidelity (knowing a die is ~40% B-spline + 17% complex steers the generator's modelling approach).
 *
 * GROUNDED (R12): the report shape is the REAL artifact -- per_class[] of
 *   { part_class, files_examined, files_parse_ok, feature_evidence_counts,
 *     geometry_complexity:{simple,medium,complex}, total_cylindrical, total_toroidal,
 *     total_conical, total_b_spline }
 * Averages = total / files_parse_ok (per-part means over the parsed corpus). Pure -> no fs/process.
 */

/** Round to `d` decimals as a number (deterministic; no locale drift). */
function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round((Number(n) || 0) * f) / f;
}

/**
 * Convert one per-class report entry -> a CAD-gen composition training pair, or null when the class
 * has no parsed files (no data to ground a claim on -- R12, never fabricate a composition).
 */
export function compositionPair(cls) {
  if (!cls || typeof cls !== "object") return null;
  const partClass = typeof cls.part_class === "string" && cls.part_class.trim() ? cls.part_class.trim() : null;
  if (!partClass) return null;
  const files = Number(cls.files_parse_ok) || 0;
  if (files <= 0) return null; // no parsed parts -> no grounded composition

  const cyl = round((Number(cls.total_cylindrical) || 0) / files);
  const tor = round((Number(cls.total_toroidal) || 0) / files);
  const con = round((Number(cls.total_conical) || 0) / files);
  const bspl = round((Number(cls.total_b_spline) || 0) / files);

  const gc = cls.geometry_complexity && typeof cls.geometry_complexity === "object" ? cls.geometry_complexity : null;
  let complexityClause = "";
  if (gc) {
    const s = Number(gc.simple) || 0, m = Number(gc.medium) || 0, c = Number(gc.complex) || 0;
    const tot = s + m + c;
    if (tot > 0) {
      const pct = (x) => Math.round((x / tot) * 100);
      complexityClause = ` Complexity distribution: ${pct(s)}% simple, ${pct(m)}% medium, ${pct(c)}% complex.`;
    }
  }

  return {
    instruction: `CAD generation from print -- a part classified as "${partClass}". What is the typical surface-primitive composition per part (from ${files} STEP files)?`,
    output: `A "${partClass}" part averages ~${cyl} cylindrical, ~${tor} toroidal, ~${con} conical, and ~${bspl} B-spline (freeform) surfaces per part.${complexityClause}`,
  };
}

/**
 * Convert a full STEP geometry report (with a per_class array) -> deduped composition pairs
 * (dedup by instruction; first-seen wins). Returns [] for a malformed report.
 */
export function reportToCompositionPairs(report) {
  if (!report || !Array.isArray(report.per_class)) return [];
  const seen = new Set();
  const out = [];
  for (const cls of report.per_class) {
    const pair = compositionPair(cls);
    if (!pair || seen.has(pair.instruction)) continue;
    seen.add(pair.instruction);
    out.push(pair);
  }
  return out;
}
