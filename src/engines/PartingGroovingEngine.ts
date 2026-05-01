/**
 * PartingGroovingEngine — Parting & Grooving Calculations
 *
 * Calculates parameters for parting-off and grooving operations:
 * - Parting blade width selection by bar diameter
 * - Cutting speed adjusted for decreasing diameter
 * - Feed rate reduction near center
 * - Grooving width/depth/feed parameters
 * - Peck grooving for deep grooves
 * - Material waste from kerf width
 *
 * Key physics: During parting, the effective cutting diameter
 * decreases from OD to center. Speed must be adjusted to
 * maintain chip formation. Feed is reduced below ~30% of
 * original diameter to prevent tool breakage at the pip.
 *
 * Reference: Sandvik parting & grooving guide (C-2920:30),
 *            ISCAR grooving application manual,
 *            Machinery's Handbook Ch.29
 *
 * Actions: parting_calc, groove_calc, peck_groove
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PartingInput {
  bar_diameter_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  blade_width_mm?: number;
  is_hollow?: boolean;
  wall_thickness_mm?: number;
}

export interface PartingResult {
  blade_width: AtomicValue;
  cutting_speed: AtomicValue;
  spindle_rpm_start: AtomicValue;
  spindle_rpm_end: AtomicValue;
  feed_rate: AtomicValue;
  reduced_feed_diameter: AtomicValue;
  cycle_time: AtomicValue;
  material_waste: AtomicValue;
  use_constant_speed: boolean;
  warnings: string[];
}

export interface GrooveInput {
  workpiece_diameter_mm: number;
  groove_width_mm: number;
  groove_depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_width_mm?: number;
}

export interface GrooveResult {
  tool_width: AtomicValue;
  num_plunges: AtomicValue;
  cutting_speed: AtomicValue;
  feed_rate: AtomicValue;
  spindle_rpm: AtomicValue;
  peck_recommended: boolean;
  peck_depth: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Blade width recommendation by bar diameter */
function recommendBladeWidth(barDia: number): number {
  if (barDia <= 10) return 1.0;
  if (barDia <= 20) return 1.5;
  if (barDia <= 40) return 2.0;
  if (barDia <= 65) return 3.0;
  if (barDia <= 100) return 4.0;
  return 5.0;
}

/** Parting cutting speed (m/min) by ISO group */
const PART_SPEEDS: Record<string, number> = {
  P: 100, M: 60, K: 120, N: 200, S: 30, H: 40,
};

/** Parting feed (mm/rev) by ISO group */
const PART_FEEDS: Record<string, number> = {
  P: 0.08, M: 0.06, K: 0.10, N: 0.12, S: 0.04, H: 0.04,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PartingGroovingEngine {
  /**
   * Calculate parting-off parameters.
   */
  parting(input: PartingInput): PartingResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const d = input.bar_diameter_mm;
    const bladeW = input.blade_width_mm ?? recommendBladeWidth(d);
    const isHollow = input.is_hollow ?? false;
    const wallT = input.wall_thickness_mm ?? d / 2;

    // Cutting speed
    const vc = PART_SPEEDS[iso] ?? 100;

    // RPM at OD and at reduced diameter
    const rpmStart = (vc * 1000) / (Math.PI * d);
    // At center approach (5mm or 30% dia, whichever is smaller)
    const endDia = isHollow
      ? d - 2 * wallT
      : Math.max(d * 0.3, 5);
    const rpmEnd = endDia > 0
      ? (vc * 1000) / (Math.PI * endDia) : rpmStart * 3;

    // Feed
    const fpr = PART_FEEDS[iso] ?? 0.08;
    // Reduce feed below 30% diameter
    const reducedFeedDia = d * 0.3;

    // Use CSS (constant surface speed) recommendation
    const useCSS = d > 20;

    // Cycle time
    const cutDepth = isHollow ? wallT : d / 2;
    // Average feed rate considering speed increase
    const avgRpm = (rpmStart + rpmEnd) / 2;
    const avgFeed = fpr * avgRpm;
    const cycleTime = avgFeed > 0 ? cutDepth / avgFeed : 0;

    // Material waste (volume of kerf)
    const wasteVolume = Math.PI * (d / 2) * (d / 2) * bladeW;
    const wasteMass = wasteVolume * 7.85e-6; // steel density kg/mm³

    // Warnings
    if (bladeW > d * 0.15) {
      warnings.push(
        "Blade width > 15% of diameter — excessive waste"
      );
    }
    if (d > 65 && bladeW < 3) {
      warnings.push(
        "Large diameter with narrow blade — risk of vibration"
      );
    }
    if (!useCSS && d > 30) {
      warnings.push(
        "Constant surface speed (CSS) recommended for D > 30mm"
      );
    }

    return {
      blade_width: av(bladeW, "mm", 0,
        `Recommended for D=${d}mm`),
      cutting_speed: av(vc, "m/min", 0.1,
        "Parting speed tables"),
      spindle_rpm_start: av(Math.round(rpmStart), "rev/min",
        0.05, "At OD"),
      spindle_rpm_end: av(Math.round(Math.min(rpmEnd, 6000)),
        "rev/min", 0.1, "At center (capped)"),
      feed_rate: av(r3(fpr), "mm/rev", 0.1,
        "Parting feed tables"),
      reduced_feed_diameter: av(r1(reducedFeedDia), "mm", 0.05,
        "30% of bar diameter"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "cut_depth / avg_feed"),
      material_waste: av(r2(wasteMass), "kg", 0.1,
        "π × r² × blade_width × density"),
      use_constant_speed: useCSS,
      warnings,
    };
  }

  /**
   * Calculate grooving parameters.
   */
  groove(input: GrooveInput): GrooveResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const wpDia = input.workpiece_diameter_mm;
    const grooveW = input.groove_width_mm;
    const grooveD = input.groove_depth_mm;

    // Tool width — equal to groove width if possible
    const toolW = input.tool_width_mm ??
      Math.min(grooveW, 6);

    // Number of plunge passes for wide groove
    const numPlunges = Math.ceil(grooveW / toolW);

    // Speed/feed
    const vc = PART_SPEEDS[iso] ?? 100;
    const rpm = (vc * 1000) / (Math.PI * wpDia);
    const fpr = (PART_FEEDS[iso] ?? 0.08) * 0.8; // reduce vs parting

    // Peck grooving for deep grooves
    const peckRecommended = grooveD > toolW * 1.5;
    const peckDepth = peckRecommended
      ? Math.min(toolW * 0.8, grooveD / 3) : grooveD;

    // Cycle time
    const numPecks = peckRecommended
      ? Math.ceil(grooveD / peckDepth) : 1;
    const timePerPlunge = (grooveD / (fpr * rpm)) * numPecks;
    const cycleTime = timePerPlunge * numPlunges;

    if (grooveD > wpDia * 0.15) {
      warnings.push(
        "Deep groove (>15% of diameter) — verify rigidity"
      );
    }
    if (toolW < 1.0) {
      warnings.push(
        "Narrow groove tool (<1mm) — fragile, reduce feed"
      );
    }

    return {
      tool_width: av(toolW, "mm", 0, "Selected tool width"),
      num_plunges: av(numPlunges, "passes", 0,
        "groove_width / tool_width"),
      cutting_speed: av(vc, "m/min", 0.1,
        "Grooving speed tables"),
      feed_rate: av(r3(fpr), "mm/rev", 0.1,
        "80% of parting feed"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D)"),
      peck_recommended: peckRecommended,
      peck_depth: av(r2(peckDepth), "mm", 0.1,
        peckRecommended
          ? "min(0.8×tool_w, depth/3)"
          : "Full depth"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "depth/feed × pecks × plunges"),
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const partingGroovingEngine = new PartingGroovingEngine();
