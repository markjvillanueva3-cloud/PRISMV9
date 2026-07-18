/**
 * TrochoidalMillingEngine — Trochoidal (Dynamic) Milling Calculations
 *
 * Calculates parameters for trochoidal/dynamic milling strategies:
 * - Trochoidal slot milling (Adaptive Clearing)
 * - Step-over and arc radius from engagement angle
 * - Adjusted feed rate for constant chip thickness
 * - Radial thinning compensation
 * - MRR comparison vs conventional slotting
 *
 * Key physics: Trochoidal milling uses a circular tool path with
 * small radial engagement but full axial depth. The thin chip
 * (radial thinning) requires feed compensation to maintain
 * productive chip load. The low engagement angle reduces heat
 * and deflection, enabling higher speeds.
 *
 * Reference: Sandvik "Dynamic Milling" guide,
 *            Mastercam Dynamic Motion whitepaper,
 *            hyperMILL trochoidal milling documentation
 *
 * Actions: trochoidal_calc, trochoidal_mrr, chip_thinning
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface TrochoidalInput {
  slot_width_mm: number;
  tool_diameter_mm: number;
  num_flutes: number;
  depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  max_engagement_pct?: number;   // default 8-15%
  axial_depth_pct?: number;      // default 100% (2×D)
}

export interface TrochoidalResult {
  step_over: AtomicValue;
  engagement_angle: AtomicValue;
  axial_depth: AtomicValue;
  adjusted_feed: AtomicValue;
  thinning_factor: AtomicValue;
  spindle_rpm: AtomicValue;
  actual_chip_load: AtomicValue;
  mrr: AtomicValue;
  conventional_mrr: AtomicValue;
  mrr_advantage: AtomicValue;
  arc_radius: AtomicValue;
  warnings: string[];
}

export interface ChipThinningInput {
  tool_diameter_mm: number;
  radial_depth_mm: number;
  desired_chip_load_mm: number;
  num_flutes: number;
  rpm: number;
}

export interface ChipThinningResult {
  adjusted_chip_load: AtomicValue;
  adjusted_feed: AtomicValue;
  thinning_factor: AtomicValue;
  engagement_angle: AtomicValue;
}

// ── Reference Data ────────────────────────────────────────────────

/** High-speed trochoidal cutting speeds (m/min) — higher than conventional */
const TROCH_SPEEDS: Record<string, number> = {
  P: 200, M: 120, K: 250, N: 500, S: 60, H: 80,
};

/** Base chip load for trochoidal (mm/tooth) */
const TROCH_CHIP_LOADS: Record<string, number> = {
  P: 0.08, M: 0.06, K: 0.10, N: 0.15, S: 0.04, H: 0.05,
};

/** Conventional speeds for MRR comparison */
const CONV_SPEEDS: Record<string, number> = {
  P: 120, M: 70, K: 150, N: 300, S: 35, H: 50,
};

/** Max engagement % by material */
const MAX_ENGAGEMENT: Record<string, number> = {
  P: 12, M: 10, K: 15, N: 15, S: 8, H: 8,
};

// ── Engine ─────────────────────────────────────────────────────────

export class TrochoidalMillingEngine {
  /**
   * Calculate trochoidal milling parameters.
   */
  calculate(input: TrochoidalInput): TrochoidalResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const d = input.tool_diameter_mm;
    const z = input.num_flutes;
    const slotW = input.slot_width_mm;
    const depth = input.depth_mm;

    // Max engagement
    const maxEng = input.max_engagement_pct ??
      (MAX_ENGAGEMENT[iso] ?? 12);
    const stepOver = d * (maxEng / 100);

    // Engagement angle (radians then degrees)
    // ae / D = (1 - cos(θ/2)) → θ = 2 × acos(1 - ae/D)
    // Simplified for small ae: θ ≈ 2 × sqrt(2 × ae/D) × (180/π)
    const aeRatio = stepOver / d;
    const engAngleRad = 2 * Math.acos(
      Math.max(-1, Math.min(1, 1 - aeRatio))
    );
    const engAngleDeg = engAngleRad * 180 / Math.PI;

    // Axial depth (typically 1.5-2× D for trochoidal)
    const axialPct = input.axial_depth_pct ?? 100;
    const axialDepth = Math.min(
      depth, d * 2 * (axialPct / 100)
    );

    // Chip thinning compensation
    // hex = fz × sqrt(ae/D × (1 - ae/D)) × 2
    // For small ae: hex ≈ fz × sqrt(ae/D) × 2
    // So: fz_adj = fz_desired / (2 × sqrt(ae/D × (1 - ae/D)))
    const thinFactor = 2 * Math.sqrt(
      aeRatio * (1 - aeRatio)
    );
    const fzBase = TROCH_CHIP_LOADS[iso] ?? 0.08;
    const fzAdj = thinFactor > 0.01
      ? fzBase / thinFactor : fzBase;

    // Speed/RPM (trochoidal allows higher speeds)
    const vc = TROCH_SPEEDS[iso] ?? 200;
    const rpm = (vc * 1000) / (Math.PI * d);

    // Adjusted feed
    const feedAdj = fzAdj * z * rpm;

    // MRR (trochoidal)
    const mrrTroch = stepOver * axialDepth * feedAdj / 1000;

    // MRR (conventional full slot — for comparison)
    const vcConv = CONV_SPEEDS[iso] ?? 120;
    const rpmConv = (vcConv * 1000) / (Math.PI * d);
    const fzConv = fzBase * 0.7; // lower chip load in slot
    const feedConv = fzConv * z * rpmConv;
    const convAxial = d * 1.0; // typical 1×D for slotting
    const mrrConv = d * convAxial * feedConv / 1000;

    // MRR ratio
    const mrrRatio = mrrConv > 0
      ? ((mrrTroch / mrrConv) * 100) : 0;

    // Arc radius for trochoidal path
    const arcRadius = (slotW - d) / 2;

    if (arcRadius <= 0) {
      warnings.push(
        "Tool diameter >= slot width — " +
        "cannot use trochoidal, use conventional slotting"
      );
    }
    if (d / slotW > 0.7) {
      warnings.push(
        "Tool/slot ratio > 70% — limited trochoidal benefit"
      );
    }
    if (maxEng > 20) {
      warnings.push(
        "Engagement > 20% — losing trochoidal benefits, " +
        "reduce step-over"
      );
    }

    return {
      step_over: av(r2(stepOver), "mm", 0.05,
        `${maxEng}% of tool diameter`),
      engagement_angle: av(r1(engAngleDeg), "deg", 0.1,
        "2 × acos(1 - ae/D)"),
      axial_depth: av(r2(axialDepth), "mm", 0.05,
        `${axialPct}% of 2×D`),
      adjusted_feed: av(Math.round(feedAdj), "mm/min", 0.1,
        "fz_adj × z × RPM (thinning compensated)"),
      thinning_factor: av(r3(thinFactor), "ratio", 0.05,
        "2 × sqrt(ae/D × (1 - ae/D))"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc_troch × 1000 / (π × D)"),
      actual_chip_load: av(r3(fzBase), "mm/tooth", 0.1,
        "Target chip thickness at cutting edge"),
      mrr: av(r1(mrrTroch), "cm³/min", 0.15,
        "ae × ap × F / 1000"),
      conventional_mrr: av(r1(mrrConv), "cm³/min", 0.15,
        "Conventional full-slot MRR"),
      mrr_advantage: av(Math.round(mrrRatio), "%", 0.2,
        "Trochoidal / conventional MRR"),
      arc_radius: av(r2(Math.max(arcRadius, 0)), "mm", 0.05,
        "(slot_width - tool_dia) / 2"),
      warnings,
    };
  }

  /**
   * Calculate chip thinning compensation for any milling operation.
   */
  chipThinning(input: ChipThinningInput): ChipThinningResult {
    const d = input.tool_diameter_mm;
    const ae = input.radial_depth_mm;
    const fzDesired = input.desired_chip_load_mm;
    const z = input.num_flutes;
    const rpm = input.rpm;

    const aeRatio = ae / d;
    const engAngleRad = 2 * Math.acos(
      Math.max(-1, Math.min(1, 1 - aeRatio))
    );
    const engAngleDeg = engAngleRad * 180 / Math.PI;

    const thinFactor = 2 * Math.sqrt(
      aeRatio * (1 - aeRatio)
    );
    const fzAdj = thinFactor > 0.01
      ? fzDesired / thinFactor : fzDesired;
    const feedAdj = fzAdj * z * rpm;

    return {
      adjusted_chip_load: av(r3(fzAdj), "mm/tooth", 0.05,
        "fz_desired / thinning_factor"),
      adjusted_feed: av(Math.round(feedAdj), "mm/min", 0.1,
        "fz_adj × z × RPM"),
      thinning_factor: av(r3(thinFactor), "ratio", 0.05,
        "2 × sqrt(ae/D × (1 - ae/D))"),
      engagement_angle: av(r1(engAngleDeg), "deg", 0.1,
        "2 × acos(1 - ae/D)"),
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const trochoidalMillingEngine =
  new TrochoidalMillingEngine();
