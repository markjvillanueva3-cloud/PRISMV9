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
  /**
   * Extended tool life prediction using ExtendedTaylorModel algorithm.
   *
   * Adds feed/depth exponents and thermal derating beyond the basic
   * T = (C/V)^(1/n) × feed/DOC corrections in calculate().
   *
   * Extended Taylor: V × T^n × f^a × d^b = C
   * Temperature derating: T_final = T_ext × temperature_factor
   * Speed for 60-min life: V₆₀ = C / 60^n (with corrections)
   *
   * Lazy-requires ExtendedTaylorModel; falls back to calculate() if unavailable.
   *
   * Reference: Taylor (1907); ISO 3685 (Tool life testing);
   *            Machining Playbook: VB ≤ 0.3mm carbide, 0.15mm finishing
   */
  extendedToolLife(input: ToolWearRateInput & {
    temperature_factor?: number;
  }): ToolWearRateResult & {
    extended_model_used: boolean;
    speed_for_60min_life: number | null;
    taylor_cliff_warning: boolean;
    taylor_warnings: string[];
  } {
    const Vc = input.cutting_speed_mpm;
    const f = input.feed_mm ?? 0.15;
    const ap = input.depth_of_cut_mm ?? 1.0;
    const toolMat = input.tool_material ?? "carbide";
    const workMat = input.work_material ?? "steel";
    const tempFactor = input.temperature_factor ?? 1.0;

    // Get Taylor constants from the engine's lookup table
    const taylorTable = TAYLOR[toolMat] ?? TAYLOR.carbide;
    const taylor = taylorTable[workMat] ?? taylorTable.steel;

    let extendedUsed = false;
    let speedFor60: number | null = null;
    let cliffWarning = false;
    const taylorWarnings: string[] = [];

    try {
      const { ExtendedTaylorModel } = require("../algorithms/ExtendedTaylorModel.js");
      const model = new ExtendedTaylorModel();
      const etResult = model.calculate({
        cutting_speed: Vc,
        C: taylor.C,
        n: taylor.n,
        feed: f,
        depth: ap,
        feed_exponent: 0.35,   // standard exponent a
        depth_exponent: 0.20,  // standard exponent b
        ref_feed: 0.15,
        ref_depth: 1.0,
        temperature_factor: tempFactor,
      });

      extendedUsed = true;
      speedFor60 = etResult.speed_for_60min ?? null;
      if (etResult.warnings) taylorWarnings.push(...etResult.warnings);
      cliffWarning = etResult.warnings?.some(
        (w: string) => w.includes("TAYLOR_CLIFF")
      ) ?? false;

      // Build result using algorithm's tool_life_minutes
      const toolLife = etResult.tool_life_minutes;
      const maxWear = input.max_flank_wear_mm ?? 0.3;
      const currentWear = input.current_flank_wear_mm ?? 0;
      const wearRate = toolLife > 0 ? maxWear / toolLife : 0;
      const wearRemaining = maxWear - currentWear;
      const remainingLife = wearRate > 0 ? wearRemaining / wearRate : 0;

      const craterRisk = Vc > taylor.C * 0.7 ? "high"
        : Vc > taylor.C * 0.5 ? "moderate" : "low";

      const warnings: string[] = [...taylorWarnings];
      if (toolLife < 5) {
        warnings.push(
          `Very short tool life ${r1(toolLife)}min — reduce speed or upgrade tool`
        );
      }
      if (currentWear > maxWear * 0.8) {
        warnings.push(
          `Flank wear ${currentWear}mm at ${r0(currentWear / maxWear * 100)}% of limit — replace soon`
        );
      }
      if (tempFactor < 0.7) {
        warnings.push(
          `Severe thermal derating (${tempFactor}) — consider coolant improvement`
        );
      }

      return {
        predicted_tool_life: av(r1(toolLife), "min", 2,
          `ExtendedTaylor: V×T^n×f^a×d^b=C, temp=${tempFactor}`),
        taylor_constant: av(taylor.C, "m/min", 0, `${toolMat} on ${workMat}`),
        taylor_exponent: av(taylor.n, "n", 0, `${toolMat} exponent`),
        flank_wear_rate: av(r4(wearRate), "mm/min", 0.001,
          `VB_max/${r1(toolLife)}min`),
        time_to_max_wear: av(r1(toolLife), "min", 2,
          `Extended Taylor with feed/depth/temp corrections`),
        remaining_life: av(r1(Math.max(remainingLife, 0)), "min", 2,
          currentWear > 0
            ? `${r3(wearRemaining)}mm remaining`
            : "No current wear data"),
        optimal_speed_cost: av(
          r0(etResult.optimal_speed), "m/min", 5,
          "85% of cutting speed (conservative)"),
        optimal_speed_productivity: av(
          r0(etResult.optimal_speed * 1.15), "m/min", 5,
          "Max production rate"),
        crater_wear_risk: av(
          craterRisk === "high" ? 2 : craterRisk === "moderate" ? 1 : 0,
          craterRisk, 0, "Speed vs Taylor C ratio"),
        warnings,
        extended_model_used: extendedUsed,
        speed_for_60min_life: speedFor60,
        taylor_cliff_warning: cliffWarning,
        taylor_warnings: taylorWarnings,
      };
    } catch {
      // Fallback: use basic calculate() method
      const baseResult = this.calculate(input);
      return {
        ...baseResult,
        extended_model_used: false,
        speed_for_60min_life: null,
        taylor_cliff_warning: false,
        taylor_warnings: ["ExtendedTaylorModel unavailable — using basic Taylor"],
      };
    }
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
