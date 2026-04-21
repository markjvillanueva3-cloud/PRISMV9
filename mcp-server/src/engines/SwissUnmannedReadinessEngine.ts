/**
 * SwissUnmannedReadinessEngine
 * ============================
 *
 * Swiss-specific lights-out / unmanned production readiness assessment
 * (U-LPS25, MS6b). Scores a production plan against 5 independent factors
 * and returns a conservative verdict — GREEN (full lights-out) only when
 * ALL five pass their thresholds. One failure drops to YELLOW (periodic
 * operator check), multiple failures or any critical factor drops to RED
 * (attended production only).
 *
 * ── Five factors ───────────────────────────────────────────────
 *   1. Chip evacuation — conveyor rate vs chip volume per hour.
 *   2. Coolant health — filter-cycle life vs batch duration; temperature margin.
 *   3. Bar feeder magazine — capacity vs batch bar count.
 *   4. Part catcher / bin — capacity vs batch part count + average part weight.
 *   5. Tool life — minimum insert life vs total batch cycle count.
 *
 * Scoring rule:
 *   GREEN  := all 5 factors pass their thresholds with ≥ 20 % margin.
 *   YELLOW := 1 factor fails threshold OR 1 factor passes with < 20 % margin.
 *   RED    := ≥ 2 factors fail, OR any factor fails by > 50 %, OR any
 *             critical factor (bar feeder, part catcher) fails.
 *
 * The engine is conservative by design: lights-out production is a
 * safety + reliability question, not a throughput optimisation question.
 * Errors toward GREEN cost the shop scrap parts and crashed machines;
 * errors toward RED cost labour but preserve machine state.
 *
 * References:
 *   - LNS lights-out production guidelines
 *   - SME Manufacturing Engineering Handbook Ch. 14 (unmanned machining)
 *
 * @module engines/SwissUnmannedReadinessEngine
 * @milestone LATHE-PRO-MS6b / U-LPS25
 */

export interface UnmannedInput {
  /** Batch quantity. */
  batch_quantity: number;
  /** Cycle time per part (s). */
  cycle_time_s: number;

  /** Chip volume per part (mm³). */
  chip_volume_mm3_per_part: number;
  /** Chip conveyor throughput (mm³/s). */
  conveyor_rate_mm3_s: number;

  /** Coolant filter remaining life (hours). */
  coolant_filter_life_h: number;
  /** Coolant temperature (°C). */
  coolant_temperature_c: number;
  /** Maximum safe coolant temperature (°C) — typically 35–40 °C. */
  coolant_max_temperature_c?: number;

  /** Bars required for batch (from SwissBarProductionEngine). */
  bars_required: number;
  /** Bar feeder magazine capacity. */
  magazine_capacity: number;

  /** Part bin capacity (count). */
  bin_capacity_parts: number;
  /** Part weight (g). */
  part_weight_g: number;
  /** Bin maximum load (kg). */
  bin_max_load_kg: number;

  /** Tool life per insert (minutes, Taylor or measured). */
  tool_life_min: number;
  /** Number of inserts available for the critical tool. */
  available_inserts: number;
}

export type ReadinessVerdict = "GREEN" | "YELLOW" | "RED";

export interface FactorReport {
  factor:
    | "chip_evacuation"
    | "coolant_health"
    | "bar_magazine"
    | "part_catcher"
    | "tool_life";
  pass: boolean;
  margin_pct: number; // positive = margin above threshold; negative = deficit
  detail: string;
  critical: boolean;
}

export interface UnmannedResult {
  verdict: ReadinessVerdict;
  factors: FactorReport[];
  batch_duration_h: number;
  reasons: string[];
  warnings: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function marginPct(have: number, need: number): number {
  if (need <= 0) return 100;
  return round2(((have - need) / need) * 100);
}

export class SwissUnmannedReadinessEngine {
  /**
   * Evaluate the 5 factors and return a conservative verdict.
   */
  assess(input: UnmannedInput): UnmannedResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const batchDurationS = input.batch_quantity * input.cycle_time_s;
    const batchDurationH = batchDurationS / 3600;

    const factors: FactorReport[] = [];

    // ── Factor 1: Chip evacuation ───────────────────────────────
    const chipRateNeeded = input.chip_volume_mm3_per_part / input.cycle_time_s;
    const chipMargin = marginPct(input.conveyor_rate_mm3_s, chipRateNeeded);
    factors.push({
      factor: "chip_evacuation",
      pass: input.conveyor_rate_mm3_s >= chipRateNeeded,
      margin_pct: chipMargin,
      detail: `need ${round2(chipRateNeeded)} mm³/s, have ${round2(input.conveyor_rate_mm3_s)} mm³/s`,
      critical: false,
    });

    // ── Factor 2: Coolant health ────────────────────────────────
    const coolantMaxT = input.coolant_max_temperature_c ?? 38;
    const tempOK = input.coolant_temperature_c <= coolantMaxT;
    const filterOK = input.coolant_filter_life_h >= batchDurationH;
    const filterMargin = marginPct(input.coolant_filter_life_h, batchDurationH);
    const tempMargin = marginPct(coolantMaxT - input.coolant_temperature_c, 0.1); // margin above 0.1°C headroom
    factors.push({
      factor: "coolant_health",
      pass: tempOK && filterOK,
      margin_pct: Math.min(filterMargin, tempMargin),
      detail:
        `filter life ${round2(input.coolant_filter_life_h)}h vs batch ${round2(batchDurationH)}h; ` +
        `temp ${input.coolant_temperature_c}°C vs max ${coolantMaxT}°C`,
      critical: false,
    });

    // ── Factor 3: Bar feeder magazine (CRITICAL) ────────────────
    const barMargin = marginPct(input.magazine_capacity, input.bars_required);
    factors.push({
      factor: "bar_magazine",
      pass: input.magazine_capacity >= input.bars_required,
      margin_pct: barMargin,
      detail: `need ${input.bars_required} bars, magazine holds ${input.magazine_capacity}`,
      critical: true,
    });

    // ── Factor 4: Part catcher (CRITICAL) ───────────────────────
    const binByCount = input.bin_capacity_parts >= input.batch_quantity;
    const binByWeight = (input.part_weight_g / 1000) * input.batch_quantity <= input.bin_max_load_kg;
    const binCountMargin = marginPct(input.bin_capacity_parts, input.batch_quantity);
    const binWeightMargin = marginPct(
      input.bin_max_load_kg,
      (input.part_weight_g / 1000) * input.batch_quantity,
    );
    factors.push({
      factor: "part_catcher",
      pass: binByCount && binByWeight,
      margin_pct: Math.min(binCountMargin, binWeightMargin),
      detail:
        `bin ${input.bin_capacity_parts} parts / ${input.bin_max_load_kg} kg vs batch ${input.batch_quantity} parts × ${input.part_weight_g}g`,
      critical: true,
    });

    // ── Factor 5: Tool life ─────────────────────────────────────
    const cycleMin = input.cycle_time_s / 60;
    const partsPerInsert = input.tool_life_min / cycleMin;
    const partsCoverable = partsPerInsert * input.available_inserts;
    const toolMargin = marginPct(partsCoverable, input.batch_quantity);
    factors.push({
      factor: "tool_life",
      pass: partsCoverable >= input.batch_quantity,
      margin_pct: toolMargin,
      detail:
        `Taylor life × inserts = ${round2(partsCoverable)} parts vs batch ${input.batch_quantity}`,
      critical: false,
    });

    // ── Verdict aggregation ─────────────────────────────────────
    const failedCritical = factors.filter(f => !f.pass && f.critical);
    const failed = factors.filter(f => !f.pass);
    const weakPasses = factors.filter(f => f.pass && f.margin_pct < 20);
    const bigDeficits = factors.filter(f => !f.pass && f.margin_pct < -50);

    let verdict: ReadinessVerdict = "GREEN";
    if (failedCritical.length > 0) {
      verdict = "RED";
      reasons.push(
        `Critical factor(s) failed: ${failedCritical.map(f => f.factor).join(", ")}.`,
      );
    } else if (failed.length >= 2 || bigDeficits.length > 0) {
      verdict = "RED";
      if (failed.length >= 2) {
        reasons.push(`${failed.length} factors failed — attended production only.`);
      }
      if (bigDeficits.length > 0) {
        reasons.push(
          `Severe deficit in: ${bigDeficits.map(f => f.factor).join(", ")} (>50% short).`,
        );
      }
    } else if (failed.length === 1) {
      verdict = "YELLOW";
      reasons.push(`${failed[0]!.factor} failed threshold — periodic operator check required.`);
    } else if (weakPasses.length > 0) {
      verdict = "YELLOW";
      reasons.push(
        `Weak margin on ${weakPasses.map(f => f.factor).join(", ")} (<20% margin).`,
      );
    } else {
      reasons.push("All 5 factors passed with ≥20% margin — full lights-out approved.");
    }

    return {
      verdict,
      factors,
      batch_duration_h: round2(batchDurationH),
      reasons,
      warnings,
    };
  }
}

/** Singleton instance. */
export const swissUnmannedReadinessEngine = new SwissUnmannedReadinessEngine();
