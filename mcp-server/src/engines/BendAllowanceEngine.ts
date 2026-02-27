/**
 * BendAllowanceEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates bend allowance, bend deduction, and flat pattern dimensions
 * for sheet metal bending operations.
 *
 * Implements: DIN 6935 bend allowance, K-factor method, empirical tables,
 * and springback compensation for various materials and tooling.
 *
 * Actions: bend_allowance_calc, bend_flat_pattern, bend_springback
 */

// ============================================================================
// TYPES
// ============================================================================

export type BendMethod = "air_bend" | "bottom_bend" | "coining" | "folding" | "roll_bend";

export interface BendAllowanceInput {
  material: string;
  thickness_mm: number;
  bend_angle_deg: number;             // included angle (90° = right angle bend)
  inside_radius_mm: number;
  k_factor?: number;                  // neutral axis shift (0.3-0.5 typical)
  bend_method: BendMethod;
  die_opening_mm?: number;            // V-die width
  tensile_strength_MPa?: number;
  yield_strength_MPa?: number;
}

export interface BendAllowanceResult {
  bend_allowance_mm: number;          // arc length along neutral axis
  bend_deduction_mm: number;          // OSSB - BA
  outside_setback_mm: number;         // OSSB
  k_factor_used: number;
  neutral_axis_radius_mm: number;
  flat_length_mm: number;             // for simple L-bend: leg1 + leg2 - BD
  springback_angle_deg: number;
  compensated_bend_angle_deg: number; // overbend angle
  min_bend_radius_mm: number;         // before cracking
  tonnage_per_meter_kN: number;       // required press force
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Default K-factors by R/T ratio
const K_FACTOR_TABLE = (rOverT: number): number => {
  if (rOverT <= 0.5) return 0.33;
  if (rOverT <= 1.0) return 0.35;
  if (rOverT <= 2.0) return 0.40;
  if (rOverT <= 4.0) return 0.45;
  return 0.50;
};

// Springback factor by material (ratio: higher = more springback)
const SPRINGBACK_FACTOR: Record<string, number> = {
  mild_steel: 0.02, stainless: 0.05, aluminum: 0.03,
  copper: 0.015, brass: 0.025, titanium: 0.06,
};

// Min bend radius as multiple of thickness (before cracking)
const MIN_RADIUS_FACTOR: Record<string, number> = {
  mild_steel: 0.5, stainless: 0.7, aluminum: 1.0,
  copper: 0.3, brass: 0.4, titanium: 2.5,
};

// Tonnage factor (kN/m per mm thickness for air bending)
const TONNAGE_FACTOR: Record<string, number> = {
  mild_steel: 1.33, stainless: 2.0, aluminum: 0.67,
  copper: 0.8, brass: 1.0, titanium: 2.5,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BendAllowanceEngine {
  calculate(input: BendAllowanceInput): BendAllowanceResult {
    const t = input.thickness_mm;
    const R = input.inside_radius_mm;
    const angle = input.bend_angle_deg;
    const complementAngle = 180 - angle; // bend complement

    // K-factor
    const rOverT = R / t;
    const kFactor = input.k_factor || K_FACTOR_TABLE(rOverT);

    // Neutral axis radius
    const neutralR = R + kFactor * t;

    // Bend allowance: BA = (π / 180) × complementAngle × neutralR
    const BA = (Math.PI / 180) * complementAngle * neutralR;

    // Outside setback: OSSB = tan(complementAngle/2) × (R + t)
    const OSSB = Math.tan((complementAngle / 2) * Math.PI / 180) * (R + t);

    // Bend deduction: BD = 2 × OSSB - BA
    const BD = 2 * OSSB - BA;

    // Springback calculation
    const matKey = this._materialKey(input.material);
    const sbFactor = SPRINGBACK_FACTOR[matKey] || 0.03;
    const yieldRatio = input.yield_strength_MPa
      ? input.yield_strength_MPa / (input.tensile_strength_MPa || 500)
      : 0.7;
    const springbackAngle = complementAngle * sbFactor * yieldRatio * (1 + rOverT * 0.5);
    const compensatedAngle = angle - springbackAngle;

    // Minimum bend radius
    const minRFactor = MIN_RADIUS_FACTOR[matKey] || 1.0;
    const minR = t * minRFactor;

    // Tonnage (air bending)
    const tonnageFactor = TONNAGE_FACTOR[matKey] || 1.33;
    const dieWidth = input.die_opening_mm || t * 8; // 8×t rule of thumb
    const tonnagePerM = tonnageFactor * t * t / dieWidth * 1000;

    // Flat length for simple L-bend (leg1=50, leg2=50 example)
    // General formula: flat = sum(legs) - n×BD where n = number of bends
    const flatLength = 100 - BD; // example with two 50mm legs

    // Recommendations
    const recs: string[] = [];
    if (R < minR) {
      recs.push(`CAUTION: Inside radius ${R}mm is below minimum ${minR.toFixed(1)}mm — risk of cracking`);
    }
    if (springbackAngle > 3) {
      recs.push(`Springback ${springbackAngle.toFixed(1)}° — overbend to ${compensatedAngle.toFixed(1)}° or use coining`);
    }
    if (input.bend_method === "air_bend" && rOverT < 0.5) {
      recs.push("Sharp bend (R/T < 0.5) — air bending may not achieve; consider bottoming or coining");
    }
    if (input.die_opening_mm && input.die_opening_mm < t * 6) {
      recs.push("Die opening < 6×thickness — excessive tonnage required, risk of die damage");
    }
    if (recs.length === 0) {
      recs.push("Bend parameters within normal range — proceed");
    }

    return {
      bend_allowance_mm: Math.round(BA * 1000) / 1000,
      bend_deduction_mm: Math.round(BD * 1000) / 1000,
      outside_setback_mm: Math.round(OSSB * 1000) / 1000,
      k_factor_used: kFactor,
      neutral_axis_radius_mm: Math.round(neutralR * 1000) / 1000,
      flat_length_mm: Math.round(flatLength * 1000) / 1000,
      springback_angle_deg: Math.round(springbackAngle * 100) / 100,
      compensated_bend_angle_deg: Math.round(compensatedAngle * 100) / 100,
      min_bend_radius_mm: Math.round(minR * 100) / 100,
      tonnage_per_meter_kN: Math.round(tonnagePerM * 10) / 10,
      recommendations: recs,
    };
  }

  private _materialKey(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("stainless") || m.includes("304") || m.includes("316")) return "stainless";
    if (m.includes("aluminum") || m.includes("6061") || m.includes("5052")) return "aluminum";
    if (m.includes("copper")) return "copper";
    if (m.includes("brass")) return "brass";
    if (m.includes("titanium") || m.includes("ti-")) return "titanium";
    return "mild_steel";
  }
}

export const bendAllowanceEngine = new BendAllowanceEngine();
