#!/usr/bin/env node
/**
 * lathe-step-profile-to-features.mjs -- slot:whiskey [KIENZLE G1 STEP closed-loop keystone]
 * ==========================================================================
 * PURE conversion: a STEP rotational profile (od_profile/id_profile produced by
 * scripts/lib/step-mesh-rotational-profile.mjs) -> TurningFeature[] + stock dims, in mm.
 *
 * This is the missing link between the STEP-side geometry leg (U-W-STEP-PROFILE /
 * U-W-STEP-SEGMENT) and the production print->program pipeline: the OCR/PDF path
 * (U-W2C) builds a TurningInput via TurningPrintIntakeEngine.convertBlueprint; the
 * STEP path needs the equivalent profile->features mapping. We mirror
 * TurningPrintIntakeEngine.profileToTurningFeature EXACTLY (od_contour/id_contour
 * features carrying profile_points {X=diameter, Z=axial}) so runPipeline sees the
 * SAME feature shape it already handles in production (R8: reuse, do not reinvent).
 *
 * UNITS-FIRST safety rail (25.4x scale-error class): scale = 25.4 (inch) | 1 (mm) |
 * null (unknown / metre -> caller SKIPS). We NEVER coerce a unitless / ambiguous
 * profile into a program -- a units mismatch is a 25.4x error.
 *
 * Pure (no I/O) + exported for direct unit testing (companion .test.mjs).
 */

const round = (x) => Math.round(x * 1000) / 1000;

/**
 * STEP length unit -> mm scale factor.
 * @param {string|undefined} units one of "inch" | "mm" | "m" | "unknown"
 * @returns {number|null} 25.4 for inch, 1 for mm, null for anything else (refuse to guess)
 */
export function unitScale(units) {
  if (units === "inch") return 25.4;
  if (units === "mm") return 1;
  return null; // "m"/"unknown" -> refuse (m would be a 1000x risk; only the two JM units are accepted)
}

/** Axial coordinate of a profile point. step-mesh-rotational-profile emits `a`; we tolerate `z` as an alias. */
const axOf = (p) => (typeof p?.a === "number" ? p.a : p?.z);

/** Keep only finite, positive-radius silhouette points (drop axis/null-r bins + NaN/Infinity -- never coerce). */
function cleanPts(pts) {
  return (pts || []).filter((p) => {
    const a = axOf(p);
    return typeof a === "number" && typeof p?.r === "number" && isFinite(a) && isFinite(p.r) && p.r > 0;
  });
}

/**
 * Convert a rotational profile to TurningFeature[] + stock envelope, all in mm.
 *
 * @param {{od_profile?:Array<{z:number,r:number|null}>, id_profile?:Array<{z:number,r:number|null}>, units?:string}} profile
 * @returns {{ok:boolean, reason?:string, scale?:number, features?:Array<object>,
 *            bar_stock_od_mm?:number, finished_od_mm?:number, part_length_mm?:number, bore_id_mm?:number}}
 */
export function profileToTurningFeatures(profile) {
  const scale = unitScale(profile?.units);
  if (scale == null) {
    return { ok: false, reason: `units ${profile?.units ?? "missing"} -- refuse to build (25.4x units rail)` };
  }

  const od = cleanPts(profile?.od_profile);
  if (od.length < 2) {
    return { ok: false, reason: `od_profile has ${od.length} finite point(s) (<2) -- not a turnable silhouette` };
  }
  const id = cleanPts(profile?.id_profile);

  // profile_points in G71/G70 form: X = diameter (2r), Z = axial, sorted ascending by axial.
  const toPts = (pts) =>
    pts.slice().sort((a, b) => axOf(a) - axOf(b)).map((p) => ({ X: round(2 * p.r * scale), Z: round(axOf(p) * scale), type: "linear" }));
  const spanMm = (pts) => {
    const as = pts.map(axOf);
    return round((Math.max(...as) - Math.min(...as)) * scale);
  };

  const features = [];
  const odPts = toPts(od);
  const odMaxDia = Math.max(...odPts.map((p) => p.X));
  const odLen = spanMm(od);
  features.push({ id: "STEP-OD-1", type: "od_contour", od_mm: odMaxDia, length_mm: odLen, profile_points: odPts });

  let boreId;
  if (id.length >= 2) {
    const idPts = toPts(id);
    boreId = Math.max(...idPts.map((p) => p.X)); // largest bore diameter (the bore the tool must clear)
    features.push({ id: "STEP-ID-1", type: "id_contour", id_mm: boreId, length_mm: spanMm(id), profile_points: idPts });
  }

  const finishedOd = round(odMaxDia);
  // Bar stock must be oversize so roughing has material to remove (else the pipeline plans no od_rough).
  // ~1.5 mm/side facing+roughing allowance -- the honest minimal default; the real bar is oversize.
  const barStock = round(odMaxDia + 3);
  return {
    ok: true,
    scale,
    features,
    bar_stock_od_mm: barStock,
    finished_od_mm: finishedOd,
    part_length_mm: odLen,
    bore_id_mm: boreId,
  };
}
