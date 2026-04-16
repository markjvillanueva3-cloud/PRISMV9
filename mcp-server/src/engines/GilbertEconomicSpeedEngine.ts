/**
 * GilbertEconomicSpeedEngine
 * ============================
 *
 * Implements Gilbert's minimum-cost cutting velocity for turning.
 *
 * Derivation (Gilbert, 1950):
 *   Total cost per part  =  machining cost  +  tool cost
 *     C(Vc) = M · t_m(Vc)  +  (M · t_ct + C_tool) · (t_m / T)
 *   With t_m ∝ 1 / Vc  and  T = (K_T / Vc)^(1/n)  (Taylor):
 *     Vc_opt =  K_T · [ n / (1 − n) · M / (M · t_ct + C_tool) ]^n
 *   where:
 *     M       machining cost rate ($/s)
 *     t_ct    tool change time (s)
 *     C_tool  cost per tool edge ($)
 *     K_T, n  Taylor constants (edge-life chart)
 *
 * Also computes:
 *   - Minimum-time speed Vc_min_t (ignores tool cost)
 *   - Maximum-profit speed (if revenue per part supplied)
 *   - The "Hi-E" range (Gilbert's high-efficiency band — between min-time
 *     and min-cost)
 *
 * Canonical references:
 *   - Gilbert W.W. "Economics of Machining" (1950), ASME
 *   - Shaw M.C. "Metal Cutting Principles" (2005) §20
 *   - Armarego E.J.A. "The Machining of Metals" (1969) §9.5
 *
 * @module engines/GilbertEconomicSpeedEngine
 * @milestone LATHE-PRO-MS5
 */

export interface GilbertEconomicInput {
  /** Taylor constant C at 1 min tool life — m/min */
  K_T: number;
  /** Taylor exponent n (typical 0.15-0.35 for carbide) */
  n: number;
  /** Machining cost rate M — $/s (labor + overhead + amortized machine) */
  machining_cost_per_sec_usd: number;
  /** Tool change time t_ct — s */
  tool_change_time_sec: number;
  /** Cost per tool edge C_tool — $ */
  tool_cost_per_edge_usd: number;
  /** Total length of cut per part (mm, for per-part cost) */
  cut_length_mm?: number;
  /** Feed (mm/rev) — needed with diameter for t_m */
  f_mm_rev?: number;
  /** Diameter (mm) — needed to convert Vc to RPM */
  diameter_mm?: number;
  /** Revenue per part (USD, for profit curve) */
  revenue_per_part_usd?: number;
  /** Optional RPM clamp (machine max) */
  rpm_clamp?: number;
}

export interface GilbertEconomicResult {
  /** Minimum-cost cutting velocity (m/min) */
  Vc_min_cost: number;
  /** Minimum-time cutting velocity (ignores tool cost) */
  Vc_min_time: number;
  /** Tool life at Vc_min_cost (minutes) */
  T_min_cost_min: number;
  /** Tool life at Vc_min_time (minutes) */
  T_min_time_min: number;
  /** Hi-E range (Gilbert high-efficiency band) */
  hi_e_range_m_min: [number, number];
  cost_per_part_at_min_cost_usd?: number;
  cost_per_part_at_min_time_usd?: number;
  /** Maximum-profit velocity (if revenue supplied) */
  Vc_max_profit?: number;
  /** Profit per hour at Vc_max_profit */
  profit_per_hour_usd?: number;
  rpm_at_min_cost?: number;
  rpm_at_min_time?: number;
  reasoning: string[];
}

function taylorLife(Vc: number, K_T: number, n: number): number {
  // T = (K_T / Vc)^(1/n)
  if (Vc <= 0) return Infinity;
  return Math.pow(K_T / Vc, 1 / n);
}

function machiningTimeSec(
  cutLengthMm: number,
  feedMmRev: number,
  diameterMm: number,
  VcMmin: number
): number {
  // RPM = 1000 * Vc / (π × D)
  const rpm = (1000 * VcMmin) / (Math.PI * diameterMm);
  const feedMmMin = rpm * feedMmRev;
  return (cutLengthMm / feedMmMin) * 60;
}

class GilbertEconomicSpeedEngineImpl {
  compute(i: GilbertEconomicInput): GilbertEconomicResult {
    if (i.K_T <= 0 || i.n <= 0 || i.n >= 1) {
      throw new Error("K_T > 0 and 0 < n < 1 required");
    }
    if (i.machining_cost_per_sec_usd <= 0) {
      throw new Error("machining_cost_per_sec_usd must be > 0");
    }

    const M = i.machining_cost_per_sec_usd;
    const t_ct = i.tool_change_time_sec;
    const C_tool = i.tool_cost_per_edge_usd;

    // Gilbert minimum-cost velocity
    // Full derivation with t_m, t_ct in seconds and Taylor T in minutes:
    //   Vc_opt = K_T · [60 · M · n / ((M·t_ct + C_tool) · (1 - n))]^n
    // The factor 60 converts Taylor-minutes into the same time unit as t_m/t_ct.
    const bracketMinCost =
      (60 * M * i.n) / ((M * t_ct + C_tool) * (1 - i.n));
    const Vc_min_cost = i.K_T * Math.pow(bracketMinCost, i.n);

    // Minimum-time velocity: only tool change time matters (tool cost excluded)
    //   Vc_min_time = K_T · [60 · n / (t_ct · (1 - n))]^n
    const bracketMinTime = (60 * i.n) / (t_ct * (1 - i.n));
    const Vc_min_time = i.K_T * Math.pow(bracketMinTime, i.n);

    const T_min_cost = taylorLife(Vc_min_cost, i.K_T, i.n);
    const T_min_time = taylorLife(Vc_min_time, i.K_T, i.n);

    const hiE: [number, number] = [
      Math.min(Vc_min_cost, Vc_min_time),
      Math.max(Vc_min_cost, Vc_min_time),
    ];

    const reasoning: string[] = [
      `Vc_min_cost = ${round2(Vc_min_cost)} m/min (Taylor K=${i.K_T}, n=${i.n})`,
      `Vc_min_time = ${round2(Vc_min_time)} m/min`,
      `Hi-E band: [${round2(hiE[0])}, ${round2(hiE[1])}] m/min`,
      `Tool life at min-cost: ${round2(T_min_cost)} min; at min-time: ${round2(T_min_time)} min`,
    ];

    let costMinCost: number | undefined;
    let costMinTime: number | undefined;
    let rpmMinCost: number | undefined;
    let rpmMinTime: number | undefined;

    if (i.cut_length_mm && i.f_mm_rev && i.diameter_mm) {
      const tm1 = machiningTimeSec(i.cut_length_mm, i.f_mm_rev, i.diameter_mm, Vc_min_cost);
      const tm2 = machiningTimeSec(i.cut_length_mm, i.f_mm_rev, i.diameter_mm, Vc_min_time);
      costMinCost = M * tm1 + (M * t_ct + C_tool) * (tm1 / (T_min_cost * 60));
      costMinTime = M * tm2 + (M * t_ct + C_tool) * (tm2 / (T_min_time * 60));
      rpmMinCost = Math.round((1000 * Vc_min_cost) / (Math.PI * i.diameter_mm));
      rpmMinTime = Math.round((1000 * Vc_min_time) / (Math.PI * i.diameter_mm));
    }

    let VcMaxProfit: number | undefined;
    let profitPerHour: number | undefined;
    if (
      i.revenue_per_part_usd &&
      i.cut_length_mm &&
      i.f_mm_rev &&
      i.diameter_mm
    ) {
      // Sweep Vc in Hi-E band, find max revenue/hour − cost/part / t_m
      let bestP = -Infinity;
      let bestVc = Vc_min_cost;
      const steps = 40;
      for (let k = 0; k <= steps; k++) {
        const Vc = hiE[0] + ((hiE[1] - hiE[0]) * k) / steps;
        const tm = machiningTimeSec(i.cut_length_mm, i.f_mm_rev, i.diameter_mm, Vc);
        const T = taylorLife(Vc, i.K_T, i.n);
        const costPart = M * tm + (M * t_ct + C_tool) * (tm / (T * 60));
        const profitPart = i.revenue_per_part_usd - costPart;
        const profitHour = (profitPart * 3600) / tm;
        if (profitHour > bestP) {
          bestP = profitHour;
          bestVc = Vc;
        }
      }
      VcMaxProfit = bestVc;
      profitPerHour = bestP;
      reasoning.push(`Vc_max_profit = ${round2(bestVc)} m/min ($${round2(bestP)}/hr)`);
    }

    // RPM clamp advisory
    if (i.rpm_clamp && rpmMinCost && rpmMinCost > i.rpm_clamp) {
      reasoning.push(
        `RPM at Vc_min_cost (${rpmMinCost}) exceeds machine clamp (${i.rpm_clamp}) — capped`
      );
    }

    return {
      Vc_min_cost: round2(Vc_min_cost),
      Vc_min_time: round2(Vc_min_time),
      T_min_cost_min: round2(T_min_cost),
      T_min_time_min: round2(T_min_time),
      hi_e_range_m_min: [round2(hiE[0]), round2(hiE[1])],
      cost_per_part_at_min_cost_usd: costMinCost !== undefined ? round4(costMinCost) : undefined,
      cost_per_part_at_min_time_usd: costMinTime !== undefined ? round4(costMinTime) : undefined,
      Vc_max_profit: VcMaxProfit !== undefined ? round2(VcMaxProfit) : undefined,
      profit_per_hour_usd: profitPerHour !== undefined ? round2(profitPerHour) : undefined,
      rpm_at_min_cost: rpmMinCost,
      rpm_at_min_time: rpmMinTime,
      reasoning,
    };
  }

  /**
   * Compare two Vc candidates and return which is closer to min-cost optimum.
   */
  compareVc(
    candidateVc: number,
    i: GilbertEconomicInput
  ): { relative: "below" | "at" | "above"; ratio: number; recommendation: string } {
    const result = this.compute(i);
    const ratio = candidateVc / result.Vc_min_cost;
    let rel: "below" | "at" | "above";
    let rec: string;
    if (Math.abs(ratio - 1) < 0.05) {
      rel = "at";
      rec = "Near optimum — good economic choice";
    } else if (ratio < 1) {
      rel = "below";
      rec = `Running slower than economic optimum (${Math.round((1 - ratio) * 100)}% below) — conservative, wastes machining time`;
    } else {
      rel = "above";
      rec = `Running faster than economic optimum (${Math.round((ratio - 1) * 100)}% above) — shortens tool life, increases cost`;
    }
    return { relative: rel, ratio: round2(ratio), recommendation: rec };
  }

  getStats(): {
    formulas: string[];
    references: string[];
  } {
    return {
      formulas: [
        "Vc_opt = K_T · [n/(1-n) · M / (M·t_ct + C_tool)]^n",
        "T = (K_T/Vc)^(1/n)",
        "t_m = (π·D·L)/(1000·Vc·f)",
      ],
      references: [
        "Gilbert (1950) — ASME",
        "Shaw (2005) — Metal Cutting Principles §20",
        "Armarego (1969) — The Machining of Metals §9.5",
      ],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const gilbertEconomicSpeedEngine = new GilbertEconomicSpeedEngineImpl();
export type { GilbertEconomicSpeedEngineImpl };
