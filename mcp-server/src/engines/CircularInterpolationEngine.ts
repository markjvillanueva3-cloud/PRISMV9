/**
 * CircularInterpolationEngine — Circular Milling Calculations
 *
 * Calculates parameters for circular interpolation operations:
 * - Circular pocket milling (G2/G3 circular tool paths)
 * - Circular boss/island milling
 * - Arc feed rate compensation (programmed vs actual chip load)
 * - Minimum/maximum bore diameter for a given tool
 * - Multi-pass circular roughing strategies
 *
 * Key physics: During circular interpolation, the programmed feed
 * at the tool center differs from the actual feed at the cutting
 * edge. For internal (bore) milling the actual feed is higher;
 * for external (boss) milling it is lower.
 *
 * Reference: Sandvik circular milling guide,
 *            Machinery's Handbook Ch.30,
 *            ISO 6983 G-code circular interpolation
 *
 * Actions: circular_bore, circular_boss, arc_feed_comp
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CircularBoreInput {
  target_diameter_mm: number;
  tool_diameter_mm: number;
  depth_mm: number;
  num_flutes: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  step_down_mm?: number;
  roughing_allowance_mm?: number;
}

export interface CircularBoreResult {
  tool_path_diameter: AtomicValue;
  radial_engagement: AtomicValue;
  programmed_feed: AtomicValue;
  actual_chip_load: AtomicValue;
  feed_compensation_factor: AtomicValue;
  spindle_rpm: AtomicValue;
  number_of_passes: AtomicValue;
  step_down: AtomicValue;
  cycle_time: AtomicValue;
  min_bore_diameter: AtomicValue;
  g_code_direction: string;
  warnings: string[];
}

export interface CircularBossInput {
  target_diameter_mm: number;
  tool_diameter_mm: number;
  depth_mm: number;
  num_flutes: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  step_down_mm?: number;
}

export interface CircularBossResult {
  tool_path_diameter: AtomicValue;
  radial_engagement: AtomicValue;
  programmed_feed: AtomicValue;
  actual_chip_load: AtomicValue;
  feed_compensation_factor: AtomicValue;
  spindle_rpm: AtomicValue;
  number_of_passes: AtomicValue;
  cycle_time: AtomicValue;
  g_code_direction: string;
  warnings: string[];
}

export interface ArcFeedInput {
  tool_diameter_mm: number;
  arc_diameter_mm: number;
  is_internal: boolean;
  desired_chip_load_mm: number;
  num_flutes: number;
  rpm: number;
}

export interface ArcFeedResult {
  programmed_feed: AtomicValue;
  actual_chip_load: AtomicValue;
  compensation_factor: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const CIRC_SPEEDS: Record<string, number> = {
  P: 120, M: 70, K: 150, N: 300, S: 40, H: 55,
};

const CIRC_CHIP_LOADS: Record<string, number> = {
  P: 0.06, M: 0.05, K: 0.07, N: 0.10, S: 0.03, H: 0.04,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CircularInterpolationEngine {
  /**
   * Calculate circular bore milling parameters.
   */
  bore(input: CircularBoreInput): CircularBoreResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.target_diameter_mm;
    const d = input.tool_diameter_mm;
    const z = input.num_flutes;
    const depth = input.depth_mm;
    const allowance = input.roughing_allowance_mm ?? 0;

    // Effective bore diameter (subtract finishing allowance)
    const boreDia = D - 2 * allowance;

    // Tool path diameter (center of tool traces this circle)
    const tpDia = boreDia - d;

    if (tpDia <= 0) {
      warnings.push(
        "Tool diameter >= bore diameter — " +
        "cannot circular mill, use direct drilling or boring"
      );
    }

    // Minimum bore = tool_dia × 1.05 (5% clearance)
    const minBore = d * 1.05;

    // Radial engagement
    const radialEngagement = (boreDia - d) / 2;

    // Cutting speed and RPM
    const vc = CIRC_SPEEDS[iso] ?? 120;
    const rpm = (vc * 1000) / (Math.PI * d);

    // Feed compensation for internal circular milling
    // Actual chip load = fz_prog × (D_bore / (D_bore - D_tool))
    // So: fz_prog = fz_desired × (D_bore - D_tool) / D_bore
    const fzDesired = CIRC_CHIP_LOADS[iso] ?? 0.06;
    const compFactor = tpDia > 0 ? tpDia / boreDia : 1;
    const fzProg = fzDesired * compFactor;
    const feedProg = fzProg * z * rpm;

    // Step down
    const stepDown = input.step_down_mm ?? d * 0.5;
    const numPasses = Math.ceil(depth / stepDown);

    // Cycle time
    const tpCirc = Math.PI * Math.abs(tpDia);
    const timePerPass = tpCirc > 0
      ? tpCirc / feedProg : 0;
    const cycleTime = timePerPass * numPasses;

    // Warnings
    if (d / D > 0.9) {
      warnings.push(
        "Tool/bore ratio > 90% — very tight circular path, " +
        "consider boring bar"
      );
    }
    if (d / D < 0.4) {
      warnings.push(
        "Tool/bore ratio < 40% — large radial engagement, " +
        "consider multiple radial passes"
      );
    }
    if (radialEngagement > d * 0.5 && tpDia > 0) {
      warnings.push(
        "Radial engagement > 50% of tool — reduce or " +
        "use multiple radial passes"
      );
    }

    return {
      tool_path_diameter: av(r2(Math.abs(tpDia)), "mm", 0.05,
        "D_bore - D_tool"),
      radial_engagement: av(r2(radialEngagement), "mm", 0.05,
        "(D_bore - D_tool) / 2"),
      programmed_feed: av(Math.round(feedProg), "mm/min", 0.1,
        "fz_comp × z × RPM"),
      actual_chip_load: av(r3(fzDesired), "mm/tooth", 0.1,
        "Target chip load at cutting edge"),
      feed_compensation_factor: av(r3(compFactor), "ratio", 0.05,
        "D_path / D_bore"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_tool)"),
      number_of_passes: av(numPasses, "passes", 0,
        "depth / step_down"),
      step_down: av(r2(stepDown), "mm", 0.05,
        "Axial depth per circular pass"),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "path_circ / feed × passes"),
      min_bore_diameter: av(r2(minBore), "mm", 0.05,
        "D_tool × 1.05"),
      g_code_direction: "G3 (CCW) for climb milling internal",
      warnings,
    };
  }

  /**
   * Calculate circular boss (external) milling parameters.
   */
  boss(input: CircularBossInput): CircularBossResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.target_diameter_mm;
    const d = input.tool_diameter_mm;
    const z = input.num_flutes;
    const depth = input.depth_mm;

    // Tool path diameter (center of tool)
    const tpDia = D + d;

    // Radial engagement (depends on stock — assume finish pass)
    const radialEngagement = d * 0.3; // typical finish

    // Speed/feed
    const vc = CIRC_SPEEDS[iso] ?? 120;
    const rpm = (vc * 1000) / (Math.PI * d);

    // Feed compensation for external circular milling
    // Actual chip load = fz_prog × D_boss / (D_boss + D_tool)
    // So: fz_prog = fz_desired × (D_boss + D_tool) / D_boss
    const fzDesired = CIRC_CHIP_LOADS[iso] ?? 0.06;
    const compFactor = tpDia / D;
    const fzProg = fzDesired * compFactor;
    const feedProg = fzProg * z * rpm;

    // Step down
    const stepDown = input.step_down_mm ?? d * 0.5;
    const numPasses = Math.ceil(depth / stepDown);

    // Cycle time
    const tpCirc = Math.PI * tpDia;
    const timePerPass = tpCirc / feedProg;
    const cycleTime = timePerPass * numPasses;

    if (D < d * 2) {
      warnings.push(
        "Small boss relative to tool — " +
        "verify tool clearance"
      );
    }

    return {
      tool_path_diameter: av(r2(tpDia), "mm", 0.05,
        "D_boss + D_tool"),
      radial_engagement: av(r2(radialEngagement), "mm", 0.05,
        "Typical finish pass engagement"),
      programmed_feed: av(Math.round(feedProg), "mm/min", 0.1,
        "fz_comp × z × RPM"),
      actual_chip_load: av(r3(fzDesired), "mm/tooth", 0.1,
        "Target chip load at cutting edge"),
      feed_compensation_factor: av(r3(compFactor), "ratio", 0.05,
        "D_path / D_boss"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_tool)"),
      number_of_passes: av(numPasses, "passes", 0,
        "depth / step_down"),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "path_circ / feed × passes"),
      g_code_direction: "G2 (CW) for climb milling external",
      warnings,
    };
  }

  /**
   * Calculate arc feed compensation for any circular path.
   */
  arcFeedComp(input: ArcFeedInput): ArcFeedResult {
    const warnings: string[] = [];
    const d = input.tool_diameter_mm;
    const arcDia = input.arc_diameter_mm;
    const fzDesired = input.desired_chip_load_mm;
    const z = input.num_flutes;
    const rpm = input.rpm;

    let compFactor: number;

    if (input.is_internal) {
      // Internal: path_dia = arc_dia - tool_dia
      const pathDia = arcDia - d;
      if (pathDia <= 0) {
        warnings.push("Tool cannot fit in arc");
        compFactor = 1;
      } else {
        compFactor = pathDia / arcDia;
      }
    } else {
      // External: path_dia = arc_dia + tool_dia
      const pathDia = arcDia + d;
      compFactor = pathDia / arcDia;
    }

    const fzProg = fzDesired * compFactor;
    const feedProg = fzProg * z * rpm;

    return {
      programmed_feed: av(Math.round(feedProg), "mm/min", 0.1,
        "fz_comp × z × RPM"),
      actual_chip_load: av(r3(fzDesired), "mm/tooth", 0,
        "Desired chip load at edge"),
      compensation_factor: av(r3(compFactor), "ratio", 0.05,
        input.is_internal
          ? "(D_arc - D_tool) / D_arc"
          : "(D_arc + D_tool) / D_arc"),
      warnings,
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

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const circularInterpolationEngine =
  new CircularInterpolationEngine();
