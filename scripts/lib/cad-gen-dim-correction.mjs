/**
 * cad-gen-dim-correction.mjs -- PURE CORE of the cad-gen dimensional-correction loop
 * (U-DELTA-CADGEN-DIM-CORRECTION, slot:delta 2026-06-28). The verifiable foundation (R13) of the
 * harness that unfreezes CAD self-learning: it diffs a text→CadQuery GEN part's PRODUCED envelope
 * (extractBboxMm of state/shared/cad-text-gen/<slug>/model.step) against the INTENDED dims parsed from
 * its own text spec, and a divergence becomes a fix-ledger correction row. The static 82-row fix-ledger
 * is fed by NO live producer today (verified 2026-06-28, see reference_delta_live_cad_loop_map); this
 * grows it from real LLM-generation divergence -> the LoRA training feed (cad-fix-training-corrections).
 *
 * SCOPE (R12, honest): parts with a PRISMATIC OUTER ENVELOPE only (cube / A×B×C block / plate /
 * gauge block, AND rectangular-featured plates whose outer dims are stated first -- a through-slot or
 * pocket is subtractive and does not change the vertex-bounded outer box).
 * The point-based STEP bbox (CARTESIAN_POINTs) is UNRELIABLE for CURVED surfaces -- it undercounts the
 * radial extent of a cylinder/disc/bore (see [[step-trailing-dot-real-silent-underextraction]] §3) --
 * so a dim diff on round parts would FALSE-FLAG. We gate those to null rather than emit a wrong
 * correction. Planar box envelopes ARE exactly bounded by their vertex points, so the diff is sound.
 *
 * Pure: no fs, no clock. The harness (next unit) reads the STEPs + appends rows with a caller stamp.
 */

/** Exact inch->mm (JM-Die spec convention is INCH). A unit conversion, not a tunable physics constant. */
export const INCH_TO_MM = 25.4;

const IN = "([0-9]+(?:\\.[0-9]+)?)"; // an inch magnitude (integer or decimal)
// Any token that means the part has a curved/feature-complex envelope the point-bbox can't bound
// exactly -> gate to null (never emit a dim correction we can't trust).
const CURVED_OR_COMPLEX = /\b(diameter|diamter|dia\b|bore|cylinder|disc|disk|round|radius|radii|taper|tapering|hex|across\s+flats|l-bracket|l\s+bracket|standoff|hub|flange|washer|bushing|ring|collar|ball-nose|ball\s+nose|dowel|v-groove|v\s+groove|vee|fillet|chamfer|countersink|counterbore|counterbored)\b/;

/**
 * Parse the INTENDED overall envelope (mm) from a GEN text spec, for PRISMATIC box-family parts only.
 * Returns { envelopeMm:[L,W,H] sorted desc, kind, parsed:true } or null when the envelope is not
 * unambiguously prismatic (curved, featured, or no clear dimension triple/pair). Conservative by design.
 */
export function parseIntendedDims(spec) {
  if (typeof spec !== "string" || !spec.trim()) return null;
  const s = spec.toLowerCase();
  if (CURVED_OR_COMPLEX.test(s)) return null; // round/featured -> point-bbox unreliable -> gate

  // "A inch by B inch by C inch" (rectangular plate / block / gauge block)
  let m = s.match(new RegExp(`${IN}\\s*inch\\s+by\\s+${IN}\\s*inch\\s+by\\s+${IN}\\s*inch`));
  if (m) {
    const dims = [m[1], m[2], m[3]].map((x) => parseFloat(x) * INCH_TO_MM);
    if (dims.every((d) => d > 0)) return { envelopeMm: dims.slice().sort((a, b) => b - a), kind: "box", parsed: true };
  }
  // "N inch cube"
  m = s.match(new RegExp(`${IN}\\s*inch\\s+cube`));
  if (m) { const d = parseFloat(m[1]) * INCH_TO_MM; if (d > 0) return { envelopeMm: [d, d, d], kind: "cube", parsed: true }; }
  // "N inch square ... M inch thick" (square plate of a given thickness)
  m = s.match(new RegExp(`${IN}\\s*inch\\s+square\\b[\\s\\S]*?${IN}\\s*inch\\s+thick`));
  if (m) {
    const a = parseFloat(m[1]) * INCH_TO_MM, t = parseFloat(m[2]) * INCH_TO_MM;
    if (a > 0 && t > 0) return { envelopeMm: [a, a, t].sort((x, y) => y - x), kind: "box", parsed: true };
  }
  return null; // un-parseable / non-prismatic envelope -> gate (R12, never fabricate a target)
}

/**
 * Compare an intended envelope (mm) against a produced STEP bbox (mm, e.g. from extractBboxMm().dims).
 * Both are sorted descending so the comparison is orientation-independent (a box's axes are
 * interchangeable; the GEN STEP may orient them differently than the spec). Per-axis relative error
 * with an absolute floor (no divide-by-near-zero on a thin dim).
 * @returns { assessable, diverged?, maxErr?, perAxis?, intended?, produced?, reason? }
 */
export function dimDivergence(intendedEnvelopeMm, producedBboxDims, { relTol = 0.02, absFloorMm = 0.5 } = {}) {
  if (!Array.isArray(intendedEnvelopeMm) || intendedEnvelopeMm.length !== 3 || !intendedEnvelopeMm.every((d) => Number.isFinite(d) && d > 0))
    return { assessable: false, reason: "no-intended-envelope" };
  if (!Array.isArray(producedBboxDims) || producedBboxDims.length !== 3 || !producedBboxDims.every(Number.isFinite))
    return { assessable: false, reason: "no-produced-bbox" };
  const intended = intendedEnvelopeMm.slice().sort((a, b) => b - a);
  const produced = producedBboxDims.slice().sort((a, b) => b - a);
  const perAxis = [0, 1, 2].map((i) => Math.abs(produced[i] - intended[i]) / Math.max(Math.abs(intended[i]), absFloorMm));
  const maxErr = Math.max(...perAxis);
  return { assessable: true, diverged: maxErr > relTol, maxErr, perAxis, intended, produced };
}

/**
 * Shape a fix-ledger correction row for a dimensional divergence, matching the canonical fix-ledger
 * schema ({v,ts,domain,kind,part,field,wrong,right,source,note,trainsCadGen}). `ts` is caller-supplied
 * (scripts forbid Date.now()). kind="dimensional-divergence" distinguishes it from the existing
 * missing-feature rows. Returns null if the divergence is not assessable or not diverged (no row).
 */
export function dimDivergenceToFixRow(div, { part, slug, ts }) {
  if (!div || !div.assessable || !div.diverged) return null;
  const fmt = (a) => a.map((x) => Math.round(x * 100) / 100).join("x");
  return {
    v: "1.0.0",
    ts: ts ?? null,
    domain: "cad",
    kind: "dimensional-divergence",
    part: part ?? "general",
    field: "envelope_bbox_mm",
    wrong: `produced ${fmt(div.produced)} mm`,
    right: `intended ${fmt(div.intended)} mm`,
    source: `cad-gen-dim:${slug ?? "unknown"}`,
    note: `text->CadQuery generation produced an envelope ${(100 * div.maxErr).toFixed(1)}% off the intended box dims (maxErr axis); regenerate to match the spec's overall size.`,
    // byte-shape parity with the canonical fixRow (cad-correction-to-fix-ledger.mjs) so every consumer
    // sees the same fields regardless of which producer wrote the row.
    cycleId: null,
    trainsPrintReader: false,
    trainsCadGen: true,
    trainsCam: false,
  };
}
