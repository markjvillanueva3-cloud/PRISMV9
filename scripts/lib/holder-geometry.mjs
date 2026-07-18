/**
 * holder-geometry.mjs — CAM-agnostic tool-holder COLLISION PROFILE model.
 *
 * CIMCO-TOOLDB-FILL-MS0 follow-on / CAM-DB-FILL (slot:romeo, 2026-06-02). The
 * keystone of "collision avoidance models within the tool creator filled out":
 * PRISM's tool corpus (EXTRACTED_DETAILED_TOOLS) carries CUTTER geometry only —
 * diameter / flutes / loc / oal / shank — and NO holder body, so a CAM tool
 * creator imported from it has an EMPTY collision model. This module synthesizes
 * the missing layer: tool → holder selection + a stepped-cylinder holder body
 * profile (the geometry a CAM collision engine sweeps against fixtures / part /
 * machine) + the tool-shaft profile + the gauge / projection that positions them.
 *
 * CONSUMER CONTRACT (read this before wiring an exporter):
 *   The canonical profile this module emits is NOT a drop-in for any CAM format —
 *   every CAM names the segment fields differently AND orders them differently.
 *   Use the provided ADAPTERS, never the raw profile:
 *     CIMCO  `.tmlib` <Holder><HolderSegments> → toCimcoSegments()  [VERIFIED here,
 *            round-trip tested through the shipped scripts/lib/cimco-tmlib.mjs]
 *     Fusion `.tools` holder.segments           → shipped in the Fusion emitter unit
 *            (field rename + order pinned against REAL `.tools` bytes there)
 *     Mastercam `.tooldb` / hyperMILL tool DB    → their respective emitter units
 *   Passing the raw {lowerDia,upperDia,height} profile straight into a consumer
 *   that expects {upper,lower,length} silently produces a ZERO-SIZE holder — a
 *   maximally false-safe (dangerous) collision model. The adapters exist to make
 *   that impossible. Build the geometry ONCE here; adapt per-CAM at the boundary.
 *
 * UNITS: everything internal is MILLIMETRES. Callers convert at the emit boundary
 * (the 25.4× error class the units-guard exists to prevent). A profile carries no
 * unit tag of its own — the emitter stamps the output unit. INCH-native PRISM tool
 * records MUST be passed `nativeUnit:"inch"` so lengths are converted. MM_PER_INCH
 * here is the EXACT inch definition (25.4), not a drifting physics constant — it
 * mirrors the same constant in the sibling cimco-tmlib.mjs emitter.
 *
 * SEGMENT CONVENTION (canonical — orientation is load-bearing for collision safety):
 *   A profile is an ordered array of frustums, ordered TIP→SPINDLE (segment[0] is
 *   nearest the cutting tip). Each frustum:
 *     { lowerDia, upperDia, height }   // lowerDia = TIP-facing Ø, upperDia = SPINDLE-facing Ø, mm
 *   A straight cylinder has lowerDia === upperDia. Heights are positive.
 *   Getting tip/spindle backwards models the holder UPSIDE-DOWN (thin where it
 *   should be fat near the part) → under-reports gouges → false-safe. The adapters
 *   own the per-CAM order/orientation translation; do not hand-roll it.
 *
 * SAFETY POSTURE — conservative / FAIL-SAFE: the holder body is modeled as full-OD
 * cylinders (no optimistic nose chamfer) so the collision envelope is never thinner
 * than reality; projection never exceeds the tool's real OAL (the holder can never
 * sit farther from the part than the tool is long); defaulted/fabricated OAL is
 * FLAGGED (oalDefaulted) so an exporter can refuse to ship a stickout it invented.
 *
 * HOLDER PROFILE SOURCE: ER collet-chuck nut/body dimensions are grounded in the
 * DIN 6499 / ISO 15488 ER standard (nut OD + clamp range), NOT invented. The
 * holder-INTERFACE physics (taper, max_rpm, balance, capacity) lives in the TS
 * ToolHolderDatabaseEngine (80+ holders incl. ER8..ER50); this module adds only the
 * BODY GEOMETRY that engine omits, so the two compose rather than duplicate.
 */

export const MM_PER_INCH = 25.4; // exact inch definition (mirrors cimco-tmlib.mjs)

/**
 * ER collet-chuck dimension table (DIN 6499 ER series), all mm.
 *   clampMin/clampMax — collet capacity (shank diameters this ER size grips;
 *                        capacities match ToolHolderDatabaseEngine.HOLDER_DB ER specs)
 *   nutDia            — collet nut outer Ø (the nose collision diameter)
 *   nutLen            — nut axial length (nose segment height)
 *   bodyDia           — slim-line chuck body Ø behind the nut
 *   bodyLen           — default exposed chuck-body length before the flange
 * The nut OD + clamp range are catalog/standard-typical; they define the collision
 * envelope. The nut nose (the part that actually gouges) is standardized by ER size.
 */
export const ER_COLLET = {
  ER8:  { clampMin: 0.5, clampMax: 5.0,  nutDia: 16, nutLen: 11, bodyDia: 21, bodyLen: 30 },
  ER11: { clampMin: 0.5, clampMax: 7.0,  nutDia: 19, nutLen: 13, bodyDia: 25, bodyLen: 32 },
  ER16: { clampMin: 1.0, clampMax: 10.0, nutDia: 28, nutLen: 20, bodyDia: 34, bodyLen: 35 },
  ER20: { clampMin: 1.0, clampMax: 13.0, nutDia: 34, nutLen: 24, bodyDia: 42, bodyLen: 38 },
  ER25: { clampMin: 1.0, clampMax: 16.0, nutDia: 42, nutLen: 28, bodyDia: 50, bodyLen: 42 },
  ER32: { clampMin: 2.0, clampMax: 20.0, nutDia: 50, nutLen: 35, bodyDia: 63, bodyLen: 45 },
  ER40: { clampMin: 3.0, clampMax: 26.0, nutDia: 63, nutLen: 42, bodyDia: 75, bodyLen: 50 },
  ER50: { clampMin: 6.0, clampMax: 34.0, nutDia: 78, nutLen: 50, bodyDia: 90, bodyLen: 58 },
};

/** ER sizes ordered smallest→largest for "smallest that fits" selection. */
const ER_ORDER = ["ER8", "ER11", "ER16", "ER20", "ER25", "ER32", "ER40", "ER50"];

const isFiniteNum = (n) => typeof n === "number" && Number.isFinite(n);
const round4 = (x) => Number(x.toFixed(4));

/**
 * Select the smallest ER collet chuck whose capacity grips the given shank Ø.
 * @param {number} shankDiaMm  shank diameter in mm (must be finite, > 0)
 * @returns {{ id:string, family:"ER", oversize:boolean } & object} the chosen ER spec.
 *   Throws on unusable input (fail-loud, never guess). If the shank exceeds the
 *   largest ER (34 mm), returns ER50 flagged `oversize:true` (a real shop steps up
 *   to a milling chuck / shrink-fit beyond ER — out of scope for ER selection).
 */
export function selectHolder(shankDiaMm, opts = {}) {
  if (opts.holderId && ER_COLLET[opts.holderId]) {
    return { id: opts.holderId, family: "ER", oversize: false, ...ER_COLLET[opts.holderId] };
  }
  if (!isFiniteNum(shankDiaMm) || shankDiaMm <= 0) {
    throw new Error(`selectHolder: shankDiaMm must be a finite positive number, got ${shankDiaMm}`);
  }
  for (const id of ER_ORDER) {
    const spec = ER_COLLET[id];
    if (shankDiaMm >= spec.clampMin && shankDiaMm <= spec.clampMax) {
      return { id, family: "ER", oversize: false, ...spec };
    }
  }
  if (shankDiaMm < ER_COLLET.ER8.clampMin) {
    return { id: "ER8", family: "ER", oversize: false, ...ER_COLLET.ER8 };
  }
  return { id: "ER50", family: "ER", oversize: true, ...ER_COLLET.ER50 };
}

/**
 * Build the stepped-cylinder HOLDER body profile (collision geometry) for a holder.
 * Ordered TIP→SPINDLE. CONSERVATIVE / fail-safe: the nut and body are modeled as
 * FULL-OD straight cylinders (no optimistic nose chamfer) so the envelope is never
 * thinner than reality. Interface/flange is omitted — CAM collision uses the nut +
 * body (the parts that reach toward the part); the flange sits up at the spindle and
 * is added by the machine model.
 *
 * @param {object} holder  result of selectHolder()
 * @returns {{ segments: Array<{lowerDia:number, upperDia:number, height:number}>,
 *            length:number, noseDia:number }}  all mm.
 */
export function holderProfile(holder) {
  if (!holder || !isFiniteNum(holder.nutDia) || !isFiniteNum(holder.bodyDia)) {
    throw new Error("holderProfile: holder must carry finite nutDia and bodyDia (from selectHolder)");
  }
  const nutDia = round4(holder.nutDia);
  const bodyDia = round4(holder.bodyDia);
  const segments = [
    // nut: full-OD straight cylinder (conservative — the gouge-critical nose Ø)
    { lowerDia: nutDia, upperDia: nutDia, height: round4(holder.nutLen) },
    // body: straight cylinder behind the nut
    { lowerDia: bodyDia, upperDia: bodyDia, height: round4(holder.bodyLen) },
  ];
  const length = round4(segments.reduce((s, g) => s + g.height, 0));
  return { segments, length, noseDia: nutDia };
}

/**
 * Build the TOOL-SHAFT profile (the non-cutting body above the flutes that the CAM
 * collision engine also checks). Ordered TIP→SPINDLE. Models the shank from the top
 * of the flutes up to the holder nose.
 *
 * @param {object} tool normalized tool { diameter_mm, shankDia_mm, fluteLen_mm, oal_mm }
 * @param {number} stickoutMm  exposed length tip→holder-nose (the projection)
 * @returns {Array<{lowerDia:number, upperDia:number, height:number}>} shaft segments (mm)
 */
export function shaftProfile(tool, stickoutMm) {
  const dia = tool.diameter_mm;
  const shank = isFiniteNum(tool.shankDia_mm) && tool.shankDia_mm > 0 ? tool.shankDia_mm : dia;
  const flute = isFiniteNum(tool.fluteLen_mm) && tool.fluteLen_mm > 0 ? tool.fluteLen_mm : round4(dia * 1.5);
  const segs = [];
  const aboveFlute = Math.max(0, round4(stickoutMm - flute));
  if (aboveFlute > 0) {
    segs.push({ lowerDia: round4(shank), upperDia: round4(shank), height: aboveFlute });
  }
  return segs;
}

/**
 * Default exposed projection (tip → holder nose), mm — CONSERVATIVE. Uses flute
 * length + 2×diameter (a rigid, short stickout), but NEVER exceeds the tool's real
 * OAL (the holder can never sit farther from the part than the tool is long — that
 * would model the holder too far back = false-safe). When OAL is real and ≥ flute,
 * the result also clears the flutes.
 */
export function defaultProjection(tool) {
  const dia = tool.diameter_mm;
  const flute = isFiniteNum(tool.fluteLen_mm) && tool.fluteLen_mm > 0 ? tool.fluteLen_mm : round4(dia * 1.5);
  const oal = isFiniteNum(tool.oal_mm) && tool.oal_mm > 0 ? tool.oal_mm : round4(flute + dia * 4);
  // never exceed OAL; flute+2*dia is the conservative target stickout.
  return round4(Math.min(flute + dia * 2, oal));
}

/**
 * Normalize a PRISM tool record (EXTRACTED_DETAILED_TOOLS / ToolRegistry shapes)
 * into canonical MM geometry. INCH-native records MUST be passed `nativeUnit:"inch"`
 * so lengths are converted (UNITS-FIRST). Returns null when the record has no usable
 * cutting diameter (never silently fabricated). When OAL is absent it is defaulted
 * AND `oalDefaulted:true` is set so downstream collision exporters know the derived
 * stickout is advisory, not measured.
 *
 * @param {object} tool raw PRISM tool record
 * @param {object} opts { nativeUnit?: "inch"|"mm" }  default "mm"
 */
export function normalizeToolMm(tool, opts = {}) {
  if (!tool || typeof tool !== "object") return null;
  const k = opts.nativeUnit === "inch" ? MM_PER_INCH : 1;
  const g = tool.geometry && typeof tool.geometry === "object" ? tool.geometry : {};

  const pick = (...vals) => {
    for (const v of vals) {
      const n = typeof v === "string" ? parseFloat(v) : v;
      if (isFiniteNum(n)) return n;
    }
    return undefined;
  };

  const diaRaw = pick(g.diameter, tool.cutting_diameter, tool.diameter, tool.dia, tool.DC);
  if (!isFiniteNum(diaRaw) || diaRaw <= 0) return null;

  const shankRaw = pick(g.shank_diameter, tool.shank_diameter, tool.shank, tool.shankDiameter, tool.SFDM);
  const fluteRaw = pick(g.flute_length, tool.flute_length, tool.loc, tool.cutting_length, tool.LCF);
  const oalRaw = pick(g.overall_length, tool.overall_length, tool.oal, tool.length, tool.OAL);
  const cornerRaw = pick(g.corner_radius, tool.corner_radius, tool.RE);
  const flutes = pick(g.flutes, tool.flute_count, tool.flutes, tool.number_of_flutes, tool.NOF);
  const point = pick(g.point_angle, tool.point_angle, tool.tip_angle, tool.included_angle);

  const diameter_mm = round4(diaRaw * k);
  let fluteLen_mm = isFiniteNum(fluteRaw) && fluteRaw > 0 ? round4(fluteRaw * k) : round4(diameter_mm * 3);
  const oalGiven = isFiniteNum(oalRaw) && oalRaw > 0;
  let oal_mm = oalGiven ? round4(oalRaw * k) : round4(fluteLen_mm + diameter_mm * 4);
  let oalDefaulted = !oalGiven;
  if (oal_mm <= fluteLen_mm) { oal_mm = round4(fluteLen_mm + Math.max(diameter_mm * 2, 5)); oalDefaulted = true; }
  const shankDia_mm = isFiniteNum(shankRaw) && shankRaw > 0 ? round4(shankRaw * k) : diameter_mm;
  const cornerRadius_mm = isFiniteNum(cornerRaw) && cornerRaw >= 0 ? round4(cornerRaw * k) : 0;

  return {
    name: String(tool.name || tool.description || tool.partNumber || tool.id || "TOOL"),
    type: String(tool.type || tool.process || "endmill"),
    diameter_mm,
    shankDia_mm,
    fluteLen_mm,
    oal_mm,
    oalDefaulted,
    cornerRadius_mm,
    flutes: isFiniteNum(flutes) && flutes > 0 ? Math.round(flutes) : undefined,
    pointAngle_deg: isFiniteNum(point) ? point : undefined,
  };
}

/**
 * Build the complete tool+holder COLLISION ASSEMBLY for one PRISM tool — the
 * canonical object every CAM exporter consumes (via its adapter) to fill its
 * collision model. All geometry is MM.
 *
 * @param {object} tool  raw PRISM tool record
 * @param {object} opts  { nativeUnit?, holderId?, projectionMm? }
 *   projectionMm override is clamped to the tool's OAL (can't project more tool than
 *   exists — a fat-fingered override can never model a non-existent over-long body).
 * @returns {null | {
 *   tool, holder:{id,family,oversize,profile}, shaft, projectionMm, gaugeLengthMm,
 *   oalDefaulted:boolean }}  null when the tool can't be normalized.
 */
export function buildAssembly(tool, opts = {}) {
  const norm = normalizeToolMm(tool, opts);
  if (!norm) return null;

  const holder = selectHolder(norm.shankDia_mm, opts);
  const profile = holderProfile(holder);

  let projectionMm;
  if (isFiniteNum(opts.projectionMm) && opts.projectionMm > 0) {
    projectionMm = round4(Math.min(opts.projectionMm, norm.oal_mm)); // never exceed real OAL
  } else {
    projectionMm = defaultProjection(norm);
  }

  const shaft = shaftProfile(norm, projectionMm);
  // gauge length = tip → spindle gauge line ≈ projection (tool below nose) + holder body length.
  const gaugeLengthMm = round4(projectionMm + profile.length);

  return {
    tool: norm,
    holder: { id: holder.id, family: holder.family, oversize: holder.oversize, profile },
    shaft,
    projectionMm,
    gaugeLengthMm,
    oalDefaulted: norm.oalDefaulted,
  };
}

// ── Per-CAM adapters (own the field-name + order/orientation translation) ──────

/**
 * Adapt a holderProfile() to the CIMCO `<Holder><HolderSegments>` shape consumed by
 * scripts/lib/cimco-tmlib.mjs `holderToXml`. CIMCO orders segments SPINDLE→TIP and
 * names them {upper, lower, length} where Upper = the SPINDLE-facing Ø and Lower =
 * the TIP-facing Ø (verified against the installed Holders.tmlib BT-30/40/50 bytes).
 * Our canonical profile is TIP→SPINDLE with upperDia=spindle, lowerDia=tip — so we
 * REVERSE the array and map upperDia→upper, lowerDia→lower, height→length.
 *
 * @param {{segments:Array<{lowerDia,upperDia,height}>}} profile result of holderProfile()
 * @returns {Array<{upper:number, lower:number, length:number}>} ready for holderToXml({segments})
 */
export function toCimcoSegments(profile) {
  if (!profile || !Array.isArray(profile.segments)) {
    throw new Error("toCimcoSegments: profile.segments must be an array (from holderProfile)");
  }
  return profile.segments
    .slice()
    .reverse() // canonical tip→spindle → CIMCO spindle→tip
    .map((s) => ({ upper: s.upperDia, lower: s.lowerDia, length: s.height }));
}

export default {
  MM_PER_INCH,
  ER_COLLET,
  selectHolder,
  holderProfile,
  shaftProfile,
  defaultProjection,
  normalizeToolMm,
  buildAssembly,
  toCimcoSegments,
};
