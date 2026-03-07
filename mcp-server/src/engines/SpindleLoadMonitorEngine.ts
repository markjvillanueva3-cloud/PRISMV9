/**
 * SpindleLoadMonitorEngine — Spindle Load Analysis & Alarm Calculator
 *
 * Calculates spindle load monitoring thresholds:
 * - Nominal load percentage from cutting parameters
 * - Alarm thresholds (warning, feed-hold, retract)
 * - Tool breakage detection limits
 * - Adaptive feed override from load
 * - Load trend analysis (increasing = wear)
 * - Air cut detection threshold
 *
 * Key physics: Spindle load % = P_cutting / P_rated × 100.
 * Normal variation ±5-10% from material hardness, tool wear.
 * Breakage shows as sudden >30% spike or >50% drop.
 * Gradual increase of 1-2%/part indicates tool wear.
 * Air cut typically < 5% load.
 *
 * Reference: Fanuc spindle load monitoring (PMC),
 *            Siemens cutting monitoring (840D),
 *            Caron Engineering tool monitoring systems
 *
 * Actions: spindle_load_monitor_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpindleLoadMonitorInput {
  cutting_power_kw?: number;
  rated_power_kw?: number;
  nominal_load_pct?: number;
  current_load_pct?: number;
  load_history?: number[];
  tool_condition?: "new" | "worn" | "unknown";
  operation?: "roughing" | "finishing" | "drilling" | "tapping";
  material_hardness_variation_pct?: number;
  adaptive_feed?: boolean;
}

export interface SpindleLoadMonitorResult {
  nominal_load: AtomicValue;
  warning_threshold: AtomicValue;
  feed_hold_threshold: AtomicValue;
  retract_threshold: AtomicValue;
  air_cut_threshold: AtomicValue;
  breakage_spike_limit: AtomicValue;
  breakage_drop_limit: AtomicValue;
  adaptive_feed_range: AtomicValue;
  wear_trend: AtomicValue;
  load_status: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Threshold multipliers by operation */
const THRESHOLDS: Record<string, {
  warn: number; hold: number; retract: number;
}> = {
  roughing:  { warn: 1.15, hold: 1.30, retract: 1.50 },
  finishing: { warn: 1.20, hold: 1.40, retract: 1.60 },
  drilling:  { warn: 1.20, hold: 1.35, retract: 1.50 },
  tapping:   { warn: 1.10, hold: 1.20, retract: 1.35 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class SpindleLoadMonitorEngine {
  calculate(input: SpindleLoadMonitorInput): SpindleLoadMonitorResult {
    const warnings: string[] = [];
    const ratedPower = input.rated_power_kw ?? 22;
    const cuttingPower = input.cutting_power_kw ?? 8;
    const op = input.operation ?? "roughing";
    const hardnessVar = input.material_hardness_variation_pct ?? 5;
    const adaptiveFeed = input.adaptive_feed ?? false;
    const toolCond = input.tool_condition ?? "unknown";

    // Nominal load
    const nomLoad = input.nominal_load_pct
      ?? (ratedPower > 0 ? (cuttingPower / ratedPower) * 100 : 50);
    const curLoad = input.current_load_pct ?? nomLoad;

    // Thresholds
    const th = THRESHOLDS[op] ?? THRESHOLDS.roughing;
    const varFactor = 1 + hardnessVar / 100;

    const warnThresh = nomLoad * th.warn * varFactor;
    const holdThresh = nomLoad * th.hold * varFactor;
    const retractThresh = nomLoad * th.retract * varFactor;

    // Air cut threshold (typically 3-8% of rated)
    const airCutThresh = Math.max(nomLoad * 0.15, 3);

    // Breakage detection
    const breakageSpike = nomLoad * 1.5; // 50% spike
    const breakageDrop = nomLoad * 0.3;  // 70% drop

    // Adaptive feed range
    const feedMin = 50;  // % feed override
    const feedMax = adaptiveFeed ? 120 : 100;

    // Wear trend from history
    let wearTrend = 0; // %/part
    const history = input.load_history;
    if (history && history.length >= 3) {
      // Simple linear regression slope
      const n = history.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += history[i];
        sumXY += i * history[i];
        sumX2 += i * i;
      }
      const denom = n * sumX2 - sumX * sumX;
      wearTrend = denom > 0
        ? (n * sumXY - sumX * sumY) / denom : 0;
    }

    // Load status
    let status: string;
    let statusCode: number;
    if (curLoad > retractThresh) {
      status = "CRITICAL";
      statusCode = 4;
    } else if (curLoad > holdThresh) {
      status = "ALARM";
      statusCode = 3;
    } else if (curLoad > warnThresh) {
      status = "WARNING";
      statusCode = 2;
    } else if (curLoad < airCutThresh) {
      status = "AIR_CUT";
      statusCode = 0;
    } else {
      status = "NORMAL";
      statusCode = 1;
    }

    // Warnings
    if (statusCode >= 3) {
      warnings.push(
        `Current load ${r1(curLoad)}% exceeds alarm threshold — ` +
        "check tool condition and parameters"
      );
    }
    if (statusCode === 2) {
      warnings.push(
        `Load ${r1(curLoad)}% above warning — ` +
        "monitor closely, tool may be wearing"
      );
    }
    if (wearTrend > 0.5) {
      warnings.push(
        `Load increasing ${r2(wearTrend)}%/part — ` +
        "tool wear detected, plan replacement"
      );
    }
    if (toolCond === "worn" && curLoad > nomLoad * 1.1) {
      warnings.push(
        "Worn tool with elevated load — replace before breakage"
      );
    }
    if (nomLoad > 80) {
      warnings.push(
        `Nominal load ${r1(nomLoad)}% is high — ` +
        "limited headroom for material variation"
      );
    }
    if (op === "tapping" && curLoad > nomLoad * 1.15) {
      warnings.push(
        "Elevated tapping load — risk of tap breakage, " +
        "check hole size and alignment"
      );
    }

    return {
      nominal_load: av(r1(nomLoad), "%", 2,
        `${cuttingPower}kW / ${ratedPower}kW × 100`),
      warning_threshold: av(r1(warnThresh), "%", 1,
        `${r1(nomLoad)} × ${th.warn} × ${r2(varFactor)}`),
      feed_hold_threshold: av(r1(holdThresh), "%", 1,
        `${r1(nomLoad)} × ${th.hold} × ${r2(varFactor)}`),
      retract_threshold: av(r1(retractThresh), "%", 1,
        `${r1(nomLoad)} × ${th.retract} × ${r2(varFactor)}`),
      air_cut_threshold: av(r1(airCutThresh), "%", 0.5,
        "15% of nominal or 3% minimum"),
      breakage_spike_limit: av(r1(breakageSpike), "%", 2,
        "150% of nominal (sudden spike)"),
      breakage_drop_limit: av(r1(breakageDrop), "%", 1,
        "30% of nominal (sudden drop)"),
      adaptive_feed_range: av(feedMax, `${feedMin}-${feedMax}%`, 0,
        adaptiveFeed ? "Adaptive enabled" : "Fixed feed"),
      wear_trend: av(r2(wearTrend), "%/part", 0.1,
        history ? `Linear fit over ${history.length} parts` : "No history"),
      load_status: av(statusCode, status, 0,
        `${r1(curLoad)}% vs thresholds`),
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

export const spindleLoadMonitorEngine = new SpindleLoadMonitorEngine();
