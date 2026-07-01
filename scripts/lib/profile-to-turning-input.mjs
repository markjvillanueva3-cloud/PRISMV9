#!/usr/bin/env node
/**
 * profile-to-turning-input.mjs -- slot:whiskey [KIENZLE G1 closed-loop keystone]
 * ==========================================================================
 * Maps a rotational profile (from step-mesh-rotational-profile / selectBestBodyProfile)
 * into a `TurningInput` -- the contract `turningPrintToProgramEngine.runPipeline` consumes
 * (TurningPrintToProgramEngine.ts:263). This is the bridge from STEP geometry to the lathe
 * print-to-program generator, so a generated program can be scored against the JM .MIN.
 *
 * DISCIPLINE:
 *  - REFUSES suspect / pick_ambiguous profiles (the closed loop must only score CLEAN
 *    geometry; an unreliable silhouette would score a program against garbage). R12.
 *  - UNITS-FIRST: only mm / inch are mapped; "unknown" is REFUSED, never assumed (a units
 *    guess is a 25.4x scale error). The probe resolves units from the STEP header.
 *  - Material is NOT in STEP geometry -> a default (1018 / ISO P) is used and FLAGGED
 *    (material_assumed:true) so the consumer knows speeds/feeds rest on an assumption.
 *
 * Pure: no FS, no engine import -- just the geometry->contract transform.
 */

const MM_PER_INCH = 25.4;
const ISO_GROUPS = Object.freeze(["P", "M", "K", "N", "S", "H"]);
const round = (v, n = 4) => Math.round(v * 10 ** n) / 10 ** n;

/**
 * @param profile  output of meshToRotationalProfile / selectBestBodyProfile
 * @param opts     { material?, materialName?, isoGroup?, stockMarginMm?, machine?,
 *                   allowSuspect?, allowAmbiguous? }
 * @returns { ok:true, turning_input, units_resolved, material_assumed } on success,
 *          or { ok:false, reason, ... } when the profile must be skipped (NOT thrown,
 *          so a batch loop can record + continue), THROWS only on structurally-invalid input.
 */
export function profileToTurningInput(profile, opts = {}) {
  if (!profile || typeof profile !== "object") throw new Error("profileToTurningInput: no profile");
  if (profile.suspect && !opts.allowSuspect) return { ok: false, reason: "suspect-profile-skipped", suspect: true };
  if (profile.pick_ambiguous && !opts.allowAmbiguous) return { ok: false, reason: "ambiguous-body-skipped", pick_ambiguous: true };

  // units-first: map mm/inch only; never guess "unknown"/"m".
  const units = profile.units;
  const isInch = units === "inch" || units === "in";
  if (units !== "mm" && !isInch) {
    if (!opts.assumeUnits) return { ok: false, reason: `units-${units || "missing"}-refused`, units };
  }
  const toMm = (v) => (isInch ? v * MM_PER_INCH : v);

  const odDia = profile.max_od_diameter;
  if (!Number.isFinite(odDia) || odDia <= 0) throw new Error("profileToTurningInput: profile has no usable max_od_diameter");
  const lenMm = toMm(profile.axis_length);
  if (!Number.isFinite(lenMm) || lenMm <= 0) throw new Error("profileToTurningInput: profile has no usable axis_length");
  const odDiaMm = toMm(odDia);

  // od_profile {a:axial, r:radius} -> profile_points {X:diameter, Z:axial-from-near-face}
  const odPts = (profile.od_profile || []).filter((p) => p && p.r != null && Number.isFinite(p.a) && Number.isFinite(p.r));
  const aMin = odPts.length ? odPts.reduce((m, p) => (p.a < m ? p.a : m), odPts[0].a) : 0;
  const toPoints = (pts) => pts.map((p) => ({ X: round(toMm(2 * p.r)), Z: round(toMm(p.a - aMin)), type: "linear" }));
  const odPoints = toPoints(odPts);

  const features = [{
    id: "OD-CONTOUR",
    type: "od_contour",
    length_mm: round(lenMm),
    od_mm: round(odDiaMm),
    ...(odPoints.length >= 2 ? { profile_points: odPoints } : {}),
  }];

  if (profile.has_bore && Number.isFinite(profile.min_id_diameter) && profile.min_id_diameter > 0) {
    const idPts = (profile.id_profile || []).filter((p) => p && p.r != null && Number.isFinite(p.a) && Number.isFinite(p.r));
    const idPoints = toPoints(idPts);
    features.push({
      id: "ID-BORE",
      type: "id_contour",
      length_mm: round(lenMm),
      id_mm: round(toMm(profile.min_id_diameter)),
      ...(idPoints.length >= 2 ? { profile_points: idPoints } : {}),
    });
  }

  const isoGroup = opts.isoGroup && ISO_GROUPS.includes(opts.isoGroup) ? opts.isoGroup : "P";
  const material = opts.material || { material_name: opts.materialName || "1018 Steel", iso_group: isoGroup };
  const materialAssumed = !opts.material && !opts.materialName;

  return {
    ok: true,
    units_resolved: isInch ? "inch" : "mm",
    material_assumed: materialAssumed,   // R12: STEP carries no material -> speeds/feeds rest on a default
    turning_input: {
      material,
      bar_stock_od_mm: round(odDiaMm + (Number.isFinite(opts.stockMarginMm) ? opts.stockMarginMm : 2), 2),
      part_length_mm: round(lenMm),
      finished_od_mm: round(odDiaMm),
      features,
      ...(opts.machine && typeof opts.machine === "object" ? opts.machine : {}),
    },
  };
}
