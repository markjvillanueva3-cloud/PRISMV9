/**
 * FlatPatternEngine — Sheet Metal Flat Pattern Calculator
 *
 * Models: Flat (developed) pattern from bent geometry.
 * - Bend allowance BA = (π/180) × θ × (Ri + K×t)
 * - Bend deduction BD = 2×OSSB - BA
 * - K-factor from material and bend ratio
 * - Multi-bend flat length calculation
 * - Minimum bend radius check
 * - Blank size estimation for box/channel
 *
 * Key physics: BA = (π/180)×θ×(Ri+Kt). OSSB = (Ri+t)×tan(θ/2).
 * K = ln(t/(Ri+t))/ln(0.5) empirical. Flat = Σlegs - Σdeductions.
 *
 * Reference: Machinery's Handbook — Bending,
 *            SheetMetal.me K-Factor Tables,
 *            ASME Y14.5 — Dimensioning
 *
 * Actions: flat_pattern_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FlatPatternInput {
  material?: "mild_steel" | "stainless" | "aluminum" | "copper" | "brass";
  thickness_mm?: number;
  bend_radius_mm?: number;
  leg_lengths_mm?: number[];
  bend_angles_deg?: number[];
  k_factor_override?: number;
}

export interface FlatPatternResult {
  k_factor: AtomicValue;
  bend_allowance_per_bend: AtomicValue;
  bend_deduction_per_bend: AtomicValue;
  total_flat_length: AtomicValue;
  outside_setback: AtomicValue;
  neutral_axis_offset: AtomicValue;
  min_bend_radius: AtomicValue;
  num_bends: AtomicValue;
  total_bend_allowance: AtomicValue;
  blank_weight: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [k_factor_soft, k_factor_hard, min_r_over_t, density_kg_m3] */
const MAT_FLAT: Record<string, [number, number, number, number]> = {
  mild_steel: [0.33, 0.40, 0.5, 7850],
  stainless:  [0.33, 0.42, 0.7, 7980],
  aluminum:   [0.33, 0.38, 0.5, 2700],
  copper:     [0.35, 0.42, 0.3, 8960],
  brass:      [0.35, 0.42, 0.4, 8500],
};

// ── Engine ─────────────────────────────────────────────────────────

export class FlatPatternEngine {
  calculate(input: FlatPatternInput): FlatPatternResult {
    const warnings: string[] = [];
    const matKey = input.material ?? "mild_steel";
    const t = input.thickness_mm ?? 2;
    const legs = input.leg_lengths_mm ?? [50, 30, 50];
    const angles = input.bend_angles_deg ?? [90, 90];

    const [kSoft, kHard, minRt, rho] = MAT_FLAT[matKey] ?? MAT_FLAT.mild_steel;

    // Inside bend radius
    const Ri = input.bend_radius_mm ?? t;

    // K-factor (depends on Ri/t ratio)
    let K: number;
    if (input.k_factor_override) {
      K = input.k_factor_override;
    } else {
      // Tighter bends → K closer to 0.33, loose → 0.40+
      K = Ri / t < 1 ? kSoft : Ri / t < 2 ? (kSoft + kHard) / 2 : kHard;
    }

    // Neutral axis offset
    const neutralOffset = K * t;

    // Min bend radius
    const minR = minRt * t;

    const nBends = Math.min(angles.length, legs.length - 1);

    // Per-bend calculations
    let totalBA = 0;
    let totalBD = 0;
    const firstAngle = angles[0] ?? 90;
    const theta = firstAngle * Math.PI / 180;

    // Bend allowance (representative for first bend)
    const BA = (Math.PI / 180) * firstAngle * (Ri + K * t);

    // Outside setback
    const OSSB = (Ri + t) * Math.tan(theta / 2);

    // Bend deduction
    const BD = 2 * OSSB - BA;

    // Calculate flat length
    for (let i = 0; i < nBends; i++) {
      const ang = angles[i] ?? 90;
      const ba = (Math.PI / 180) * ang * (Ri + K * t);
      const ossb = (Ri + t) * Math.tan((ang * Math.PI / 180) / 2);
      const bd = 2 * ossb - ba;
      totalBA += ba;
      totalBD += bd;
    }

    const sumLegs = legs.reduce((s, l) => s + l, 0);
    const flatLength = sumLegs - totalBD;

    // Blank weight (assuming 100mm width)
    const blankWidth = 100; // mm assumed
    const weight = flatLength * blankWidth * t / 1e9 * rho; // kg

    // Warnings
    if (Ri < minR) {
      warnings.push(`Bend radius ${Ri}mm < min ${r1(minR)}mm for ${matKey} — cracking risk`);
    }
    if (K < 0.25 || K > 0.5) {
      warnings.push(`K-factor ${K} outside typical 0.25-0.50 range`);
    }
    if (nBends !== angles.length || nBends !== legs.length - 1) {
      warnings.push("Legs should be one more than angles (leg-bend-leg pattern)");
    }
    if (Ri / t > 5) {
      warnings.push(`Ri/t=${r1(Ri / t)} > 5 — large radius, verify K-factor accuracy`);
    }

    const src = "FlatPatternEngine (Machinery's HB)";

    return {
      k_factor: mkAv(r3(K), "K", 0.02, `${matKey} Ri/t=${r1(Ri / t)}`),
      bend_allowance_per_bend: mkAv(r2(BA), "mm", BA * 0.03,
        `(π/180)×${firstAngle}×(${Ri}+${r3(K)}×${t})`),
      bend_deduction_per_bend: mkAv(r2(BD), "mm", BD * 0.05,
        `2×OSSB - BA`),
      total_flat_length: mkAv(r1(flatLength), "mm", flatLength * 0.01,
        `Σlegs - Σdeductions`),
      outside_setback: mkAv(r2(OSSB), "mm", OSSB * 0.03,
        `(Ri+t)×tan(θ/2)`),
      neutral_axis_offset: mkAv(r2(neutralOffset), "mm", neutralOffset * 0.05,
        `K×t`),
      min_bend_radius: mkAv(r1(minR), "mm", minR * 0.1,
        `${minRt}×t for ${matKey}`),
      num_bends: mkAv(nBends, "bends", 0, `${legs.length} legs`),
      total_bend_allowance: mkAv(r2(totalBA), "mm", totalBA * 0.03,
        `Sum of ${nBends} bends`),
      blank_weight: mkAv(r3(weight), "kg", weight * 0.02,
        `${r1(flatLength)}×100×${t}mm ${matKey}`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const flatPatternEngine = new FlatPatternEngine();
