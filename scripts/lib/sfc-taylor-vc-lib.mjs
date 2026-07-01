// scripts/lib/sfc-taylor-vc-lib.mjs
//
// SFC-JM-ACCURACY -- compare a PROGRAMMED lathe cutting speed (from a JM G96 CSS
// op) to PRISM's physics-recommended cutting speed derived from the canonical
// Taylor tool-life model. This is the "verify the SFC calculations are correct,
// test against the JM programs" core for the dominant JM domain (turning), where
// the programmed surface speed IS Vc directly -- no tool diameter needed.
//
// Taylor: T = (C / Vc)^(1/n)  ->  Vc(T) = C / T^n   [C, Vc in m/min; T in min].
// So for a target tool life T, the physics-recommended cutting speed is C/T^n.
// A program whose Vc is far ABOVE the short-life rec runs hot (tool-life/safety
// risk); far BELOW the long-life rec leaves productivity on the table (or is HSS
// tooling -- the canonical C is for CARBIDE, so this is LABELED, not absolute).
//
// PURE: takes the canonical {C, n} as inputs (the CALLER imports CANONICAL_TAYLOR
// from src/physics/constants.ts under tsx -- this lib never inlines a constant).

// Exact unit definition (NOT a physics constant): 1 sfm = 1 ft/min = 0.3048 m/min.
export const SFM_TO_MMIN = 0.3048;

// Target tool-life envelope (min) for the recommended-Vc band. Engineering choice
// (production turning), NOT a physics constant -- tune freely.
export const LIFE_TARGETS = Object.freeze({ aggressive: 10, nominal: 15, conservative: 30 });
// Below this fraction of the 30-min rec, a program is "very conservative" -- the
// regime where carbide is grossly underutilized OR the tool is actually HSS.
export const VERY_CONSERVATIVE_FRACTION = 0.5;

/**
 * Convert a programmed spindle value to m/min cutting speed.
 * G96 S is a surface speed: m/min when the program is metric, else sfm (JM inch
 * convention -- LABELED via assumedUnit; never silently assumed for a real cut).
 */
export function programmedVcMmin(spindleValue, units) {
  if (!Number.isFinite(spindleValue)) return { mmin: null, assumedUnit: null };
  if (units === "metric") return { mmin: spindleValue, assumedUnit: "m/min" };
  return { mmin: spindleValue * SFM_TO_MMIN, assumedUnit: "sfm(inch-convention)" };
}

/** Taylor recommended cutting speed [m/min] for a target tool life [min]. */
export function taylorVc(C, n, lifeMin) {
  if (!Number.isFinite(C) || !Number.isFinite(n) || !Number.isFinite(lifeMin) || lifeMin <= 0) return null;
  return C / Math.pow(lifeMin, n);
}

/**
 * Classify a programmed cutting speed against the Taylor recommended band for a
 * material's canonical {C, n}.
 * @returns {{ programmedMmin, recVc:{aggressive,nominal,conservative}, ratioNominal,
 *             band:'aggressive'|'in-band'|'conservative'|'very-conservative'|'unknown' }}
 */
export function classifyProgrammedVc(programmedMmin, C, n) {
  const recVc = {
    aggressive: taylorVc(C, n, LIFE_TARGETS.aggressive),
    nominal: taylorVc(C, n, LIFE_TARGETS.nominal),
    conservative: taylorVc(C, n, LIFE_TARGETS.conservative),
  };
  if (!Number.isFinite(programmedMmin) || recVc.nominal == null) {
    return { programmedMmin, recVc, ratioNominal: null, band: "unknown" };
  }
  const ratioNominal = programmedMmin / recVc.nominal;
  let band;
  if (programmedMmin > recVc.aggressive) band = "aggressive";           // life < 10 min: hot
  else if (programmedMmin >= recVc.conservative) band = "in-band";       // 10-30 min life
  else if (programmedMmin >= VERY_CONSERVATIVE_FRACTION * recVc.conservative) band = "conservative";
  else band = "very-conservative";                                      // <50% of 30-min rec
  return { programmedMmin, recVc, ratioNominal, band };
}
