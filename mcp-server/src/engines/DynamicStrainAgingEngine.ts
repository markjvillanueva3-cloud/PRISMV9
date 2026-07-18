/**
 * DynamicStrainAgingEngine -- DSA (dynamic strain aging / Portevin-Le Chatelier /
 * blue-brittleness) WINDOW advisory.
 *
 * UNIT-0007 (Work Hardening and Dynamic Strain Aging). Verified this session: DSA was
 * modeled NOWHERE (strain-aging|portevin|dynamic-strain|blue-brittle = 0 matches across
 * mcp-server/src). Standard Johnson-Cook (positive strain-rate sensitivity C>0, monotonic
 * thermal softening) does NOT capture DSA, where in a material-specific TEMPERATURE window
 * solute atoms pin dislocations, producing: NEGATIVE strain-rate sensitivity, serrated (PLC)
 * flow, degraded surface finish, and higher-than-JC cutting force. This engine surfaces that
 * window as an ADVISORY -- it does NOT change any force/flow-stress calculation (that
 * force-correction delta_sigma_DSA is a separate, physics-reviewer-GATED follow, per oscar
 * refuse-list skipping-physics-reviewer-on-force-or-stability-formula).
 *
 * PURE + NEVER-THROWS (matches BUEOnsetThresholdEngine): invalid inputs -> supported:false /
 * warnings, never thrown.
 *
 * DATA HONESTY (R12): the window bounds are LITERATURE-TYPICAL bands, NOT measured JM data.
 * Plain-carbon/low-alloy steel blue-brittleness/DSA peak ~250-350 C (band ~200-400 C);
 * austenitic 300-series stainless serrated (PLC) flow ~250-600 C. Sources: Rodriguez 1984
 * (Bull. Mater. Sci., PLC/DSA review); Kubin & Estrin (dislocation dynamics of DSA); machining
 * DSA studies for steels/stainless. Each window carries a +/- uncertainty. Material classes
 * without a documented machining-regime DSA window are returned supported:false (NOT guessed).
 */

// --- Types ------------------------------------------------------------------

export type DSAMaterialClass =
  | "carbon_steel" | "low_alloy_steel" | "austenitic_stainless" | "ferritic_stainless" | "other";

export type ISOGroupLite = "P" | "M" | "K" | "N" | "S" | "H";

export interface DSAInput {
  /** Preferred: explicit DSA material class. */
  material_class?: DSAMaterialClass;
  /** Fallback: ISO 513 group (P steel / M stainless / K cast iron / N nonferrous / S superalloy / H hardened). */
  iso_group?: ISOGroupLite;
  /** Estimated cutting-zone (shear-zone) temperature in degrees C -- the DSA driver. */
  cutting_zone_temp_C: number;
  /** Optional strain rate (1/s); DSA severity is mildly rate-dependent (informational only here). */
  strain_rate_per_s?: number;
}

export interface DSAWindowBand { lo_C: number; hi_C: number; peak_C: number; unc_C: number; }

export interface DSAResult {
  /** Was a documented DSA window available for this material class? */
  supported: boolean;
  material_class: DSAMaterialClass;
  in_dsa_window: boolean;
  /** 0 (outside) .. 1 (at the window peak) -- triangular within [lo,hi], 0 at edges. */
  severity: number;
  /** Absolute +/- uncertainty on the window bounds (deg C). */
  window_uncertainty_C: number;
  window_C: DSAWindowBand | null;
  /** Physically-expected DSA effects when in-window (informational). */
  expected_effects: string[];
  recommendation: string;
  /** Multiplicative flow-stress/force correction for the DSA regime (>=1, SAFE direction).
   *  1.0 outside the window; up to 1+DSA_FORCE_PEAK at the window peak (severity-scaled). The
   *  productSFC apply that would consume this to raise Fc is physics-reviewer-gated (task #11);
   *  this engine only EXPOSES the factor, it does not apply it. */
  force_correction_factor: number;
  /** Absolute +/- uncertainty on force_correction_factor. */
  force_correction_uncertainty: number;
  warnings: string[];
  source: string;
}

// --- Literature-typical DSA windows (deg C); null = no documented machining-regime window ---

const DSA_WINDOWS: Record<DSAMaterialClass, DSAWindowBand | null> = {
  // Plain-carbon + low-alloy steels: blue-brittleness / DSA. Peak ~300 C, band ~200-400 C.
  carbon_steel:         { lo_C: 200, hi_C: 400, peak_C: 300, unc_C: 40 },
  low_alloy_steel:      { lo_C: 200, hi_C: 400, peak_C: 300, unc_C: 40 },
  // Austenitic 300-series stainless: serrated (PLC) flow, wider + hotter band.
  austenitic_stainless: { lo_C: 250, hi_C: 600, peak_C: 450, unc_C: 60 },
  // Ferritic/martensitic stainless: DSA reported, narrower; conservative band.
  ferritic_stainless:   { lo_C: 200, hi_C: 450, peak_C: 325, unc_C: 60 },
  // Cast iron / aluminum / superalloy / hardened: no well-documented machining-regime DSA
  // window here -> report unsupported rather than fabricate a band.
  other: null,
};

const EXPECTED_EFFECTS = [
  "negative strain-rate sensitivity (flow stress can rise as strain rate falls)",
  "serrated / Portevin-Le Chatelier flow",
  "degraded surface finish + built-up-edge tendency",
  "higher cutting force than a standard Johnson-Cook prediction",
];

/** DSA raises flow stress ~10-30% inside the window (Rodriguez 1984 PLC review + DSA-in-machining
 *  studies for carbon steel + 300-series SS). CONSERVATIVE: +15% at the severity peak, in the SAFE
 *  direction (higher force -> more conservative SFC recommendation), severity-scaled to 0 at the
 *  window edges. NOT measured JM data -- carries DSA_FORCE_UNC; the productSFC apply is
 *  physics-reviewer-gated (task #11). */
const DSA_FORCE_PEAK = 0.15;
const DSA_FORCE_UNC = 0.08;

// --- classification ---------------------------------------------------------

/** Map an ISO 513 group to a DSA material class (coarse; explicit material_class overrides). */
export function isoGroupToDSAClass(g: ISOGroupLite | undefined): DSAMaterialClass {
  switch (g) {
    case "P": return "carbon_steel";       // steels (carbon + low-alloy)
    case "M": return "austenitic_stainless"; // stainless (300-series dominant)
    default: return "other";                // K/N/S/H: no documented machining DSA window
  }
}

function triangularSeverity(t: number, w: DSAWindowBand): number {
  if (t <= w.lo_C || t >= w.hi_C) return 0;
  if (t === w.peak_C) return 1;
  if (t < w.peak_C) return (t - w.lo_C) / (w.peak_C - w.lo_C);
  return (w.hi_C - t) / (w.hi_C - w.peak_C);
}

// --- Engine -----------------------------------------------------------------

class DynamicStrainAgingEngineImpl {
  /**
   * Assess whether a material at an estimated cutting-zone temperature is in its DSA window.
   * ADVISORY only -- returns no force/flow-stress change. Never throws.
   *
   * @param input material class or iso_group + cutting_zone_temp_C (+ optional strain_rate).
   * @returns in_dsa_window + triangular severity + expected effects + a shift-Vc recommendation.
   */
  assess(input: DSAInput): DSAResult {
    const warnings: string[] = [];

    const cls: DSAMaterialClass = input.material_class && input.material_class in DSA_WINDOWS
      ? input.material_class
      : isoGroupToDSAClass(input.iso_group);
    if (input.material_class && !(input.material_class in DSA_WINDOWS)) {
      warnings.push(`Unknown material_class "${input.material_class}"; derived "${cls}" from iso_group.`);
    }

    const window = DSA_WINDOWS[cls];
    const temp = input.cutting_zone_temp_C;
    if (!Number.isFinite(temp)) {
      warnings.push(`cutting_zone_temp_C is not a finite number; cannot assess the DSA window.`);
      return {
        supported: window !== null, material_class: cls, in_dsa_window: false, severity: 0,
        window_uncertainty_C: window?.unc_C ?? 0, window_C: window, expected_effects: [],
        force_correction_factor: 1.0, force_correction_uncertainty: 0,
        recommendation: "Provide a finite cutting-zone temperature (deg C) to assess DSA.",
        warnings, source: SOURCE,
      };
    }

    if (window === null) {
      return {
        supported: false, material_class: cls, in_dsa_window: false, severity: 0,
        window_uncertainty_C: 0, window_C: null, expected_effects: [],
        force_correction_factor: 1.0, force_correction_uncertainty: 0,
        recommendation: `No documented machining-regime DSA window for material class "${cls}" -- DSA advisory not applicable (not fabricated).`,
        warnings, source: SOURCE,
      };
    }

    const inWindow = temp > window.lo_C && temp < window.hi_C;
    const severity = +triangularSeverity(temp, window).toFixed(4);

    let recommendation: string;
    if (inWindow) {
      recommendation = `Cutting-zone temp ~${Math.round(temp)} C is inside the ${cls} DSA window [${window.lo_C}-${window.hi_C} C, peak ${window.peak_C} C +/-${window.unc_C}]. Expect serrated flow / negative rate sensitivity / degraded finish + elevated force. Shift cutting speed to move the cutting-zone temperature OUT of the band (typically lower Vc below the band for finish-critical cuts), or accept the anomaly on roughing.`;
    } else {
      recommendation = `Cutting-zone temp ~${Math.round(temp)} C is outside the ${cls} DSA window [${window.lo_C}-${window.hi_C} C] -- no DSA anomaly expected at this operating point.`;
    }

    // Force-correction factor: SAFE-direction (>=1) severity-scaled flow-stress/force multiplier for
    // the DSA regime, EXPOSED for the physics-reviewer-gated productSFC apply (this engine does NOT
    // apply it). 1.0 outside the window.
    const forceCorrectionFactor = inWindow ? +(1 + severity * DSA_FORCE_PEAK).toFixed(4) : 1.0;
    return {
      supported: true, material_class: cls, in_dsa_window: inWindow, severity,
      window_uncertainty_C: window.unc_C, window_C: window,
      expected_effects: inWindow ? EXPECTED_EFFECTS.slice() : [],
      force_correction_factor: forceCorrectionFactor,
      force_correction_uncertainty: inWindow ? DSA_FORCE_UNC : 0,
      recommendation, warnings, source: SOURCE,
    };
  }
}

const SOURCE = "DynamicStrainAgingEngine (literature-typical DSA windows: Rodriguez 1984 / Kubin-Estrin; NOT measured JM data; EXPOSES force_correction_factor (SAFE direction, +15% peak) but does NOT itself apply it -- the productSFC force apply is physics-reviewer-gated)";

/** Singleton export per PRISM engine convention. */
export const dynamicStrainAgingEngine = new DynamicStrainAgingEngineImpl();
