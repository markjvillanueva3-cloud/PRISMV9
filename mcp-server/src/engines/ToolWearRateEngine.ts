/**
 * ToolWearRateEngine — Tool Wear & Life Prediction
 *
 * Predicts tool wear and life:
 * - Taylor tool life equation: VT^n = C
 * - Flank wear rate estimation
 * - Crater wear depth prediction
 * - Extended Taylor (speed + feed + DOC)
 * - Cost-optimized vs productivity-optimized speed
 * - Remaining life estimation from current wear
 *
 * Key physics: Taylor's equation V×T^n = C relates cutting
 * speed V to tool life T. The exponent n depends on tool
 * material (HSS: 0.1, carbide: 0.25, ceramic: 0.4). Flank
 * wear VB progresses: initial rapid wear → steady state →
 * accelerated failure. Crater wear is temperature-driven
 * and dominates at high speeds.
 *
 * Reference: Taylor Tool Life equation,
 *            ISO 3685 (Tool life testing),
 *            Machinery's Handbook Ch.28 (Tool Wear)
 *
 * Actions: tool_wear_rate_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ToolWearRateInput {
  cutting_speed_mpm: number;
  feed_mm?: number;
  depth_of_cut_mm?: number;
  tool_material?: "hss" | "carbide" | "cermet"
    | "ceramic" | "cbn" | "pcd";
  work_material?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "inconel";
  current_flank_wear_mm?: number;
  max_flank_wear_mm?: number;
  cutting_time_min?: number;
}

export interface ToolWearRateResult {
  predicted_tool_life: AtomicValue;
  taylor_constant: AtomicValue;
  taylor_exponent: AtomicValue;
  flank_wear_rate: AtomicValue;
  time_to_max_wear: AtomicValue;
  remaining_life: AtomicValue;
  optimal_speed_cost: AtomicValue;
  optimal_speed_productivity: AtomicValue;
  crater_wear_risk: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Taylor constants: n (exponent), C (constant at T=1min) */
const TAYLOR: Record<string, Record<string, {
  n: number; C: number;
}>> = {
  hss: {
    steel: { n: 0.125, C: 70 },
    aluminum: { n: 0.13, C: 200 },
    stainless: { n: 0.10, C: 50 },
    cast_iron: { n: 0.14, C: 80 },
    titanium: { n: 0.10, C: 30 },
    inconel: { n: 0.08, C: 20 },
  },
  carbide: {
    steel: { n: 0.25, C: 300 },
    aluminum: { n: 0.28, C: 700 },
    stainless: { n: 0.20, C: 200 },
    cast_iron: { n: 0.27, C: 350 },
    titanium: { n: 0.20, C: 120 },
    inconel: { n: 0.15, C: 80 },
  },
  cermet: {
    steel: { n: 0.30, C: 350 },
    aluminum: { n: 0.32, C: 600 },
    stainless: { n: 0.25, C: 250 },
    cast_iron: { n: 0.30, C: 400 },
    titanium: { n: 0.22, C: 130 },
    inconel: { n: 0.18, C: 90 },
  },
  ceramic: {
    steel: { n: 0.40, C: 500 },
    aluminum: { n: 0.40, C: 800 },
    stainless: { n: 0.35, C: 350 },
    cast_iron: { n: 0.45, C: 600 },
    titanium: { n: 0.30, C: 150 },
    inconel: { n: 0.25, C: 120 },
  },
  cbn: {
    steel: { n: 0.50, C: 800 },
    aluminum: { n: 0.50, C: 1000 },
    stainless: { n: 0.45, C: 600 },
    cast_iron: { n: 0.55, C: 900 },
    titanium: { n: 0.40, C: 300 },
    inconel: { n: 0.35, C: 200 },
  },
  pcd: {
    steel: { n: 0.30, C: 200 },
    aluminum: { n: 0.55, C: 1500 },
    stainless: { n: 0.25, C: 150 },
    cast_iron: { n: 0.35, C: 400 },
    titanium: { n: 0.30, C: 180 },
    inconel: { n: 0.25, C: 100 },
  },
};

// ── Engine ─────────────────────────────────────────────────────────

export class ToolWearRateEngine {
  calculate(input: ToolWearRateInput): ToolWearRateResult {
    const warnings: string[] = [];
    const Vc = input.cutting_speed_mpm;
    const f = input.feed_mm ?? 0.15;
    const ap = input.depth_of_cut_mm ?? 1.0;
    const toolMat = input.tool_material ?? "carbide";
    const workMat = input.work_material ?? "steel";
    const currentWear = input.current_flank_wear_mm ?? 0;
    const maxWear = input.max_flank_wear_mm ?? 0.3;
    const cuttingTime = input.cutting_time_min ?? 0;

    // Taylor parameters
    const taylorTable = TAYLOR[toolMat] ?? TAYLOR.carbide;
    const taylor = taylorTable[workMat]
      ?? taylorTable.steel;
    const n = taylor.n;
    const C = taylor.C;

    // Extended Taylor: T = (C / V)^(1/n) × feed/DOC correction
    const feedCorr = Math.pow(0.15 / f, 0.3);
    const docCorr = Math.pow(1.0 / ap, 0.15);
    const toolLife = Math.pow(C / Vc, 1 / n) * feedCorr * docCorr;

    // Flank wear rate (mm/min) in steady-state region
    const wearRate = maxWear / toolLife;

    // Time to max wear
    const timeToMax = maxWear / wearRate;

    // Remaining life
    const wearRemaining = maxWear - currentWear;
    const remainingLife = wearRemaining > 0
      ? wearRemaining / wearRate : 0;

    // Optimal cutting speed for minimum cost
    // V_cost = C × ((1/n - 1) × Tc / Ct)^n
    // Simplified: ~70% of max speed
    const optSpeedCost = C * Math.pow(
      (1 / n - 1) * 0.5, n
    );

    // Optimal speed for max productivity: ~85% of V_max
    const optSpeedProd = optSpeedCost * 1.3;

    // Crater wear risk (high at high temps/speeds)
    const craterRisk = Vc > C * 0.7 ? "high"
      : Vc > C * 0.5 ? "moderate" : "low";

    // Warnings
    if (toolLife < 5) {
      warnings.push(
        `Very short tool life ${r1(toolLife)}min — ` +
        "reduce speed or upgrade tool"
      );
    }
    if (Vc > C) {
      warnings.push(
        `Speed ${Vc} m/min exceeds Taylor constant ` +
        `${C} — tool life < 1 minute`
      );
    }
    if (currentWear > maxWear * 0.8) {
      warnings.push(
        `Flank wear ${currentWear}mm at ${r0(currentWear / maxWear * 100)}% ` +
        "of limit — replace soon"
      );
    }
    if (toolMat === "hss" && Vc > 100) {
      warnings.push(
        "HSS at high speed — consider carbide upgrade"
      );
    }
    if (workMat === "inconel" && toolMat === "hss") {
      warnings.push(
        "HSS on Inconel — extremely short life, " +
        "use ceramic or CBN"
      );
    }

    return {
      predicted_tool_life: av(r1(toolLife), "min", 2,
        `Taylor: (${C}/${Vc})^(1/${n}) × corrections`),
      taylor_constant: av(C, "m/min", 0,
        `${toolMat} on ${workMat}`),
      taylor_exponent: av(n, "n", 0,
        `${toolMat} exponent`),
      flank_wear_rate: av(r4(wearRate), "mm/min", 0.001,
        `VB_max/${r1(toolLife)}min`),
      time_to_max_wear: av(r1(timeToMax), "min", 2,
        `${maxWear}mm / ${r4(wearRate)} mm/min`),
      remaining_life: av(r1(remainingLife), "min", 2,
        currentWear > 0
          ? `${r3(wearRemaining)}mm remaining at ${r4(wearRate)} mm/min`
          : "No current wear data"),
      optimal_speed_cost: av(r0(optSpeedCost), "m/min", 5,
        "Minimum cost per part"),
      optimal_speed_productivity: av(r0(optSpeedProd),
        "m/min", 5, "Maximum production rate"),
      crater_wear_risk: av(
        craterRisk === "high" ? 2
          : craterRisk === "moderate" ? 1 : 0,
        craterRisk, 0,
        `Speed vs Taylor C ratio`),
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

export const toolWearRateEngine = new ToolWearRateEngine();
