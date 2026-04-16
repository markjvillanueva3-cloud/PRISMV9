/**
 * RunoutCompensationEngine — TIR Measurement & Compensation
 *
 * Calculates runout (TIR) parameters and compensation:
 * - Total Indicator Reading from measured high/low points
 * - Acceptable TIR limits by application
 * - Compensation strategies (grinding, shimming, adjusting)
 * - Effect of runout on surface finish and tool life
 * - Runout stack-up from holder + tool + spindle
 *
 * Key physics: Runout creates uneven chip load distribution.
 * With TIR of δ, one flute cuts δ/2 more than nominal while
 * the opposite cuts δ/2 less. This causes premature wear on
 * the heavy-cutting flute and poor surface finish. Runout
 * compounds through the tooling stack: spindle + holder +
 * collet + tool.
 *
 * Reference: ASME Y14.5 (Runout tolerances),
 *            Haimer Tool Measurement Guide,
 *            Sandvik Rotating Tool Holders Ch.3
 *
 * Actions: runout_compensation_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface RunoutCompensationInput {
  measured_tir_mm?: number;
  spindle_runout_mm?: number;
  holder_runout_mm?: number;
  tool_runout_mm?: number;
  tool_diameter_mm?: number;
  flutes?: number;
  application?: "roughing" | "finishing" | "precision"
    | "micro_machining";
  holder_type?: "shrink_fit" | "collet" | "er"
    | "hydraulic" | "milling_chuck";
  feed_per_tooth_mm?: number;
}

export interface RunoutCompensationResult {
  total_tir: AtomicValue;
  tir_limit: AtomicValue;
  tir_status: AtomicValue;
  effective_flutes: AtomicValue;
  chip_load_variation: AtomicValue;
  tool_life_impact: AtomicValue;
  surface_finish_impact: AtomicValue;
  compensation_strategy: AtomicValue;
  holder_contribution: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** TIR limits by application (mm) */
const TIR_LIMITS: Record<string, number> = {
  roughing: 0.025,
  finishing: 0.010,
  precision: 0.005,
  micro_machining: 0.002,
};

/** Typical holder runout (mm at 3×D) */
const HOLDER_TIR: Record<string, number> = {
  shrink_fit: 0.003,
  hydraulic: 0.003,
  milling_chuck: 0.005,
  collet: 0.008,
  er: 0.012,
};

// ── Engine ─────────────────────────────────────────────────────────

export class RunoutCompensationEngine {
  calculate(
    input: RunoutCompensationInput
  ): RunoutCompensationResult {
    const warnings: string[] = [];
    const app = input.application ?? "finishing";
    const holderType = input.holder_type ?? "collet";
    const flutes = input.flutes ?? 4;
    const fz = input.feed_per_tooth_mm ?? 0.08;
    const Dt = input.tool_diameter_mm ?? 10;

    // TIR from stack-up or measured
    const spindleTir = input.spindle_runout_mm ?? 0.002;
    const holderTir = input.holder_runout_mm
      ?? (HOLDER_TIR[holderType] ?? 0.008);
    const toolTir = input.tool_runout_mm ?? 0.005;

    // Stack-up: RSS (root sum square) of contributions
    const stackTir = Math.sqrt(
      spindleTir ** 2 + holderTir ** 2 + toolTir ** 2
    );
    const totalTir = input.measured_tir_mm ?? stackTir;

    // TIR limit for application
    const tirLimit = TIR_LIMITS[app] ?? 0.010;

    // Status
    const isOk = totalTir <= tirLimit;
    const statusVal = isOk ? 1 : 0;

    // Effective flutes: runout means fewer flutes cutting equally
    // If TIR > fz, some flutes don't cut at all
    const tirToFz = totalTir / fz;
    let effectiveFlutes = flutes;
    if (tirToFz > 0.5) {
      // Progressively reduce effective flute count
      effectiveFlutes = Math.max(
        1,
        flutes * (1 - tirToFz * 0.5)
      );
    }

    // Chip load variation: heavy flute gets fz + TIR/2
    const chipLoadVar = totalTir / 2;
    const maxChipLoad = fz + chipLoadVar;
    const minChipLoad = Math.max(0, fz - chipLoadVar);

    // Tool life impact: % reduction
    // Rough model: tool life drops proportional to TIR/fz ratio
    const lifeReduction = Math.min(
      80,
      tirToFz * 40
    );

    // Surface finish impact (μm Ra increase)
    const raIncrease = totalTir * 25; // rough correlation

    // Compensation strategy
    let strategy: string;
    if (totalTir <= 0.003) {
      strategy = "acceptable";
    } else if (totalTir <= 0.010) {
      strategy = "upgrade_holder";
    } else if (totalTir <= 0.020) {
      strategy = "recheck_assembly";
    } else {
      strategy = "replace_components";
    }

    // Holder contribution as percentage
    const holderPct = stackTir > 0
      ? (holderTir / stackTir) * 100 : 0;

    // Warnings
    if (!isOk) {
      warnings.push(
        `TIR ${r4(totalTir)}mm exceeds ${app} limit ` +
        `of ${tirLimit}mm`
      );
    }
    if (tirToFz > 0.5) {
      warnings.push(
        `TIR is ${r0(tirToFz * 100)}% of chip load — ` +
        "uneven cutting, accelerated wear"
      );
    }
    if (tirToFz > 1.0) {
      warnings.push(
        "TIR > chip load — some flutes not cutting, " +
        "effectively single-flute operation"
      );
    }
    if (holderType === "er" && app === "precision") {
      warnings.push(
        "ER collet for precision work — upgrade to " +
        "shrink-fit or hydraulic"
      );
    }
    if (totalTir > Dt * 0.005) {
      warnings.push(
        "TIR > 0.5% of tool diameter — " +
        "significant diameter accuracy impact"
      );
    }

    return {
      total_tir: av(r4(totalTir), "mm", 0.001,
        input.measured_tir_mm
          ? "Measured value"
          : `RSS: spindle=${spindleTir} + holder=${holderTir} + tool=${toolTir}`),
      tir_limit: av(tirLimit, "mm", 0,
        `${app} application limit`),
      tir_status: av(statusVal,
        isOk ? "PASS" : "FAIL", 0,
        isOk
          ? `${r4(totalTir)} ≤ ${tirLimit}`
          : `${r4(totalTir)} > ${tirLimit}`),
      effective_flutes: av(r1(effectiveFlutes),
        "flutes", 0.5,
        tirToFz > 0.5
          ? `Reduced from ${flutes} by TIR`
          : `All ${flutes} cutting equally`),
      chip_load_variation: av(r4(chipLoadVar),
        "mm/tooth", 0.001,
        `TIR/2 = ±${r4(chipLoadVar)} on ${fz}mm/tooth`),
      tool_life_impact: av(r0(lifeReduction), "%", 5,
        `${r0(lifeReduction)}% life reduction from TIR`),
      surface_finish_impact: av(r3(raIncrease), "μm Ra",
        0.1, "Estimated finish degradation"),
      compensation_strategy: av(
        strategy === "acceptable" ? 0
          : strategy === "upgrade_holder" ? 1
          : strategy === "recheck_assembly" ? 2 : 3,
        strategy, 0,
        `Based on TIR=${r4(totalTir)}mm`),
      holder_contribution: av(r0(holderPct), "%", 5,
        `${holderType}: ${r4(holderTir)}mm of ${r4(stackTir)}mm`),
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

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const runoutCompensationEngine = new RunoutCompensationEngine();
