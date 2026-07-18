/**
 * ToolRunoutEngine — TIR Measurement & Impact Analysis
 *
 * Calculates the impact of tool runout (TIR) on machining:
 * - Effective chip load variation per flute
 * - Tool life reduction from uneven loading
 * - Surface finish degradation
 * - Dimensional accuracy impact
 * - Runout budget allocation (holder + spindle + tool)
 *
 * Key physics: Runout causes one flute to cut deeper than
 * others. At 10µm TIR on a 4-flute tool with 0.05mm/tooth
 * feed, one flute takes 0.06mm while another takes 0.04mm —
 * a 50% variation. This reduces tool life by 30-50% and
 * degrades surface finish proportionally.
 *
 * Reference: Sandvik tool holding guide,
 *            BIG DAISHOWA runout measurement handbook,
 *            Haimer shrink-fit technology guide
 *
 * Actions: runout_impact_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface RunoutInput {
  total_tir_um: number;
  tool_diameter_mm: number;
  num_flutes: number;
  feed_per_tooth_mm: number;
  holder_type?: "collet" | "shrink_fit" | "hydraulic"
    | "milling_chuck" | "weldon";
  spindle_runout_um?: number;
}

export interface RunoutResult {
  max_chip_load: AtomicValue;
  min_chip_load: AtomicValue;
  chip_load_variation: AtomicValue;
  tool_life_factor: AtomicValue;
  ra_degradation_factor: AtomicValue;
  dimensional_error: AtomicValue;
  runout_budget: {
    spindle: AtomicValue;
    holder: AtomicValue;
    tool: AtomicValue;
    total: AtomicValue;
  };
  holder_recommendation: string;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical TIR contribution by holder type (µm) */
const HOLDER_TIR: Record<string, number> = {
  collet: 5,
  shrink_fit: 2,
  hydraulic: 3,
  milling_chuck: 8,
  weldon: 15,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ToolRunoutEngine {
  /**
   * Calculate runout impact on machining performance.
   */
  calculate(input: RunoutInput): RunoutResult {
    const warnings: string[] = [];
    const tir = input.total_tir_um;
    const D = input.tool_diameter_mm;
    const z = input.num_flutes;
    const fz = input.feed_per_tooth_mm;
    const holder = input.holder_type ?? "collet";
    const spindleTir = input.spindle_runout_um ?? 3;

    // TIR in mm
    const tirMm = tir / 1000;

    // Chip load variation
    // Max chip on heaviest-loaded flute: fz + TIR
    // Min chip on lightest flute: fz - TIR
    const maxChip = fz + tirMm;
    const minChip = Math.max(fz - tirMm, 0);
    const chipVariation = fz > 0
      ? ((maxChip - minChip) / fz) * 100
      : 0;

    // Tool life reduction
    // Empirical: life ∝ (1 / max_chip)^n where n ≈ 0.25
    // Relative to ideal: factor = (fz / maxChip)^0.25
    const toolLifeFactor = maxChip > 0
      ? Math.pow(fz / maxChip, 0.25)
      : 1;

    // Ra degradation
    // Surface finish worsens proportionally to runout
    // Ra_actual ≈ Ra_ideal × (1 + TIR/fz)
    const raDegradation = 1 + tirMm / Math.max(fz, 0.001);

    // Dimensional error (radial)
    const dimError = tirMm;

    // Runout budget breakdown
    const holderTir = HOLDER_TIR[holder] ?? 5;
    const toolManufTir = 3; // typical ground tool
    // Total = √(spindle² + holder² + tool²) for RSS
    const rssTotal = Math.sqrt(
      spindleTir * spindleTir
      + holderTir * holderTir
      + toolManufTir * toolManufTir
    );

    // Holder recommendation
    let holderRec = "ER collet (standard)";
    if (tir > 10 || D < 6) {
      holderRec = "Shrink-fit or hydraulic chuck";
    }
    if (D < 3) {
      holderRec = "Shrink-fit (mandatory for micro tools)";
    }
    if (tir <= 3) {
      holderRec = "Current setup adequate";
    }

    // Warnings
    if (chipVariation > 50) {
      warnings.push(
        `Chip load variation ${Math.round(chipVariation)}% — ` +
        "one flute doing most of the work"
      );
    }
    if (tirMm > fz) {
      warnings.push(
        "TIR exceeds feed per tooth — " +
        "some flutes not cutting, rubbing only"
      );
    }
    if (toolLifeFactor < 0.7) {
      warnings.push(
        `Tool life reduced to ${Math.round(toolLifeFactor * 100)}% — ` +
        "reduce runout or increase feed"
      );
    }
    if (D < 3 && tir > 5) {
      warnings.push(
        "High runout on small tool — " +
        "risk of breakage, use shrink-fit holder"
      );
    }
    if (holder === "weldon" && D < 10) {
      warnings.push(
        "Weldon holder has high TIR — " +
        "upgrade to collet or shrink-fit"
      );
    }

    return {
      max_chip_load: av(r3(maxChip), "mm", 0.05,
        "fz + TIR"),
      min_chip_load: av(r3(minChip), "mm", 0.05,
        "fz - TIR (min 0)"),
      chip_load_variation: av(
        Math.round(chipVariation), "%", 0.1,
        "(max - min) / fz × 100"
      ),
      tool_life_factor: av(r2(toolLifeFactor), "ratio", 0.15,
        "(fz / max_chip)^0.25"),
      ra_degradation_factor: av(r2(raDegradation), "ratio", 0.15,
        "1 + TIR / fz"),
      dimensional_error: av(r3(dimError), "mm", 0.05,
        "Equal to TIR"),
      runout_budget: {
        spindle: av(spindleTir, "µm", 0.1, "Spindle TIR"),
        holder: av(holderTir, "µm", 0.1,
          `${holder} typical`),
        tool: av(toolManufTir, "µm", 0.1,
          "Ground tool manufacturing"),
        total: av(r1(rssTotal), "µm", 0.1,
          "RSS: √(spindle² + holder² + tool²)"),
      },
      holder_recommendation: holderRec,
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

export const toolRunoutEngine = new ToolRunoutEngine();
