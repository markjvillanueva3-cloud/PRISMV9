/**
 * SpindleRunoutEngine — Spindle Runout Analysis & Impact Calculator
 *
 * Calculates spindle runout effects on machining:
 * - TIR at spindle nose and at tool tip
 * - Surface finish degradation from runout
 * - Effective tool diameter change
 * - Tool life reduction factor
 * - Roundness error prediction
 * - Acceptable runout for tolerance
 *
 * Key physics: Tool tip TIR = spindle TIR + holder TIR + collet TIR
 * (worst case addition, RSS for statistical). Surface finish
 * degrades as Ra_actual = Ra_ideal × (1 + k×TIR/feed).
 * Tool life reduces exponentially with runout: ratio ~e^(-α×TIR).
 *
 * Reference: Lion Precision spindle error analysis,
 *            Haimer runout measurement guide,
 *            ASME B89.3.4 (axes of rotation)
 *
 * Actions: spindle_runout_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpindleRunoutInput {
  spindle_tir_um?: number;
  holder_tir_um?: number;
  collet_tir_um?: number;
  tool_diameter_mm?: number;
  tool_length_mm?: number;
  feed_per_tooth_mm?: number;
  flutes?: number;
  part_tolerance_mm?: number;
  operation?: "milling" | "drilling" | "reaming" | "boring";
  holder_type?: "er_collet" | "shrink_fit" | "hydraulic"
    | "milling_chuck" | "side_lock";
}

export interface SpindleRunoutResult {
  total_tir: AtomicValue;
  tir_at_tool_tip: AtomicValue;
  effective_diameter_range: AtomicValue;
  surface_finish_factor: AtomicValue;
  tool_life_factor: AtomicValue;
  roundness_error: AtomicValue;
  max_acceptable_tir: AtomicValue;
  effective_flutes: AtomicValue;
  hole_oversize: AtomicValue;
  runout_to_tolerance: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical holder TIR (µm) */
const HOLDER_TIR: Record<string, number> = {
  er_collet: 10,
  shrink_fit: 3,
  hydraulic: 3,
  milling_chuck: 8,
  side_lock: 15,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SpindleRunoutEngine {
  calculate(input: SpindleRunoutInput): SpindleRunoutResult {
    const warnings: string[] = [];
    const holderType = input.holder_type ?? "er_collet";
    const spindleTIR = input.spindle_tir_um ?? 2;
    const holderTIR = input.holder_tir_um
      ?? HOLDER_TIR[holderType] ?? 10;
    const colletTIR = input.collet_tir_um ?? 5;
    const toolDia = input.tool_diameter_mm ?? 10;
    const toolLen = input.tool_length_mm ?? 75;
    const fz = input.feed_per_tooth_mm ?? 0.05;
    const flutes = input.flutes ?? 4;
    const partTol = input.part_tolerance_mm ?? 0.025;
    const op = input.operation ?? "milling";

    // Total TIR at spindle nose (RSS)
    const totalTIR_rss = Math.sqrt(
      spindleTIR ** 2 + holderTIR ** 2 + colletTIR ** 2
    );
    // Worst case
    const totalTIR_wc = spindleTIR + holderTIR + colletTIR;

    // TIR at tool tip (amplified by L/D ratio)
    const ld = toolDia > 0 ? toolLen / toolDia : 5;
    const amplification = 1 + (ld - 3) * 0.05; // 5% per L/D above 3
    const tipTIR = totalTIR_rss * Math.max(amplification, 1);

    // Effective diameter range
    const tirMm = tipTIR / 1000;
    const diaRange = tirMm * 2; // ± TIR on radius

    // Surface finish degradation
    // Factor: 1 + k × TIR / (feed × 1000)
    const k = 1.5; // empirical constant
    const fzMm = fz;
    const finishFactor = 1 + k * (tipTIR / 1000) / Math.max(fzMm, 0.01);

    // Tool life reduction
    // Exponential: life_factor = e^(-5 × TIR_mm)
    const lifeFactor = Math.exp(-5 * tirMm);

    // Roundness error (approximately TIR/2 for single-point, TIR for multi-flute)
    const roundnessError = op === "boring"
      ? tipTIR / 2 : tipTIR;

    // Max acceptable TIR for part tolerance
    // Rule of thumb: TIR < 20% of tolerance
    const maxAcceptTIR = partTol * 0.2 * 1000; // µm

    // Effective flutes (high runout means only some flutes cut)
    const tirPerTooth = tipTIR / 1000; // mm
    const effFlutes = fz > 0
      ? Math.max(1, flutes * Math.min(1, fz / (fz + tirPerTooth)))
      : flutes;

    // Hole oversize (for drilling/reaming)
    const holeOversize = (op === "drilling" || op === "reaming")
      ? tipTIR / 1000 * 2 : 0; // diameter oversize in mm

    // Runout to tolerance ratio
    const runoutToTol = partTol > 0
      ? (tipTIR / 1000 / partTol) * 100 : 100;

    // Warnings
    if (tipTIR > maxAcceptTIR) {
      warnings.push(
        `TIR at tool tip ${r1(tipTIR)}µm exceeds ` +
        `${r1(maxAcceptTIR)}µm max for ${partTol}mm tolerance`
      );
    }
    if (holderType === "side_lock") {
      warnings.push(
        "Side-lock holder has high runout — " +
        "consider shrink-fit or hydraulic"
      );
    }
    if (lifeFactor < 0.7) {
      warnings.push(
        `Tool life reduced to ${r0(lifeFactor * 100)}% by runout — ` +
        "reduce TIR to extend tool life"
      );
    }
    if (effFlutes < flutes * 0.7) {
      warnings.push(
        `Only ${r1(effFlutes)} of ${flutes} flutes cutting effectively — ` +
        "one flute taking excessive load"
      );
    }
    if (op === "reaming" && tipTIR > 5) {
      warnings.push(
        `TIR ${r1(tipTIR)}µm too high for reaming — ` +
        "target < 5µm with hydraulic holder"
      );
    }
    if (ld > 5 && tipTIR > 15) {
      warnings.push(
        `Long tool (L/D=${r1(ld)}) amplifies runout to ${r1(tipTIR)}µm`
      );
    }

    return {
      total_tir: mkAv(r1(totalTIR_rss), "µm", 1,
        `RSS(${spindleTIR}, ${holderTIR}, ${colletTIR})`),
      tir_at_tool_tip: mkAv(r1(tipTIR), "µm", 1,
        `× ${r2(amplification)} amplification at L/D ${r1(ld)}`),
      effective_diameter_range: mkAv(r4(diaRange), "mm", 0.001,
        `±${r4(tirMm)}mm on radius`),
      surface_finish_factor: mkAv(r2(finishFactor), "×", 0.05,
        `Ra_actual = Ra_ideal × ${r2(finishFactor)}`),
      tool_life_factor: mkAv(r2(lifeFactor), "×", 0.02,
        `e^(-5 × ${r4(tirMm)})`),
      roundness_error: mkAv(r1(roundnessError), "µm", 0.5,
        op === "boring" ? "TIR/2 (single point)" : "≈TIR"),
      max_acceptable_tir: mkAv(r1(maxAcceptTIR), "µm", 0.5,
        `20% of ${partTol}mm tolerance`),
      effective_flutes: mkAv(r1(effFlutes), "flutes", 0.2,
        `${flutes} nominal, adjusted for TIR`),
      hole_oversize: mkAv(r4(holeOversize), "mm", 0.002,
        op === "drilling" || op === "reaming"
          ? "2 × TIR" : "N/A (milling)"),
      runout_to_tolerance: mkAv(r1(runoutToTol), "%", 1,
        `TIR / tolerance × 100`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const spindleRunoutEngine = new SpindleRunoutEngine();
