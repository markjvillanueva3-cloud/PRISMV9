/**
 * StrategyCostOptimalEngine — CAMX-MS2/U05
 *
 * Cost-optimal decision engine for CAM strategy selection.
 * At every decision point, computes the total cost of each candidate
 * strategy option and selects the minimum total cost.
 *
 * Total cost model (per roadmap CAMX-MS2/U05):
 *   total_cost = cycle_time_cost + tool_cost + energy_cost + scrap_risk_cost
 *
 * Components:
 *   cycle_time_cost = cycle_time_min × machine_rate_per_min
 *   tool_cost       = (cycle_time_min / expected_tool_life_min) × tool_price
 *   energy_cost     = (avg_power_kW × cycle_time_min / 60) × energy_rate_per_kWh
 *   scrap_risk_cost = failure_probability × part_value
 *
 * References:
 *   - Trent & Wright (2000) "Metal Cutting" Ch. 9 — tool cost model
 *   - Kalpakjian (2018) "Manufacturing Engineering" §25 — cycle economics
 *   - ISO 3685:1993 Taylor tool life (consumable cost amortization)
 *
 * @module engines/StrategyCostOptimalEngine
 * @milestone CAMX-MS2/U05
 */

// ============================================================================
// TYPES
// ============================================================================

/** A candidate strategy option with estimated production parameters */
export interface StrategyCostOption {
  /** Identifier for the strategy (e.g., "adaptive_clearing") */
  strategy_id: string;
  /** Estimated cycle time in minutes */
  cycle_time_min: number;
  /** Expected tool life at these params (minutes of cut time) */
  expected_tool_life_min: number;
  /** Tool replacement cost (USD per tool) */
  tool_price_usd: number;
  /** Average spindle power during cut (kW) */
  avg_power_kW: number;
  /** Estimated failure/scrap probability (0-1) */
  failure_probability: number;
  /** Optional notes about the strategy */
  notes?: string;
}

/** Rate inputs that apply globally for all options */
export interface CostRates {
  /** Shop labor/machine rate per minute (USD/min) */
  machine_rate_per_min_usd: number;
  /** Electrical energy rate (USD/kWh) */
  energy_rate_per_kWh_usd: number;
  /** Value of the workpiece if scrapped (USD) */
  part_value_usd: number;
}

/** Breakdown of cost components for a single strategy option */
export interface StrategyCostBreakdown {
  strategy_id: string;
  cycle_time_cost_usd: number;
  tool_cost_usd: number;
  energy_cost_usd: number;
  scrap_risk_cost_usd: number;
  total_cost_usd: number;
  /** Percentage contribution of each component to total */
  breakdown_pct: {
    cycle_time_pct: number;
    tool_pct: number;
    energy_pct: number;
    scrap_risk_pct: number;
  };
}

/** Full decision result: ranked options with the minimum-cost winner */
export interface StrategyCostDecision {
  ranked: StrategyCostBreakdown[];
  best: StrategyCostBreakdown;
  savings_vs_worst_usd: number;
  explanation: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class StrategyCostOptimalEngine {
  /**
   * Compute total cost for a single strategy option.
   * @param option - Strategy parameters
   * @param rates - Global shop rates
   */
  computeCost(option: StrategyCostOption, rates: CostRates): StrategyCostBreakdown {
    if (option.cycle_time_min <= 0) {
      throw new Error(`StrategyCostOptimal: cycle_time_min must be > 0, got ${option.cycle_time_min}`);
    }
    if (option.expected_tool_life_min <= 0) {
      throw new Error(`StrategyCostOptimal: expected_tool_life_min must be > 0, got ${option.expected_tool_life_min}`);
    }
    if (option.failure_probability < 0 || option.failure_probability > 1) {
      throw new Error(`StrategyCostOptimal: failure_probability must be in [0,1], got ${option.failure_probability}`);
    }

    const cycle_time_cost = option.cycle_time_min * rates.machine_rate_per_min_usd;
    // Tool cost = fraction of tool life consumed × tool price
    const tool_fraction_used = option.cycle_time_min / option.expected_tool_life_min;
    const tool_cost = tool_fraction_used * option.tool_price_usd;
    // Energy: power(kW) × time(min) → kWh needs /60
    const energy_cost = (option.avg_power_kW * option.cycle_time_min / 60) * rates.energy_rate_per_kWh_usd;
    // Scrap risk expected cost
    const scrap_risk_cost = option.failure_probability * rates.part_value_usd;

    const total_cost = cycle_time_cost + tool_cost + energy_cost + scrap_risk_cost;

    return {
      strategy_id: option.strategy_id,
      cycle_time_cost_usd: round2(cycle_time_cost),
      tool_cost_usd: round2(tool_cost),
      energy_cost_usd: round2(energy_cost),
      scrap_risk_cost_usd: round2(scrap_risk_cost),
      total_cost_usd: round2(total_cost),
      breakdown_pct: {
        cycle_time_pct: total_cost > 0 ? round2((cycle_time_cost / total_cost) * 100) : 0,
        tool_pct: total_cost > 0 ? round2((tool_cost / total_cost) * 100) : 0,
        energy_pct: total_cost > 0 ? round2((energy_cost / total_cost) * 100) : 0,
        scrap_risk_pct: total_cost > 0 ? round2((scrap_risk_cost / total_cost) * 100) : 0,
      },
    };
  }

  /**
   * Rank multiple strategy options and pick minimum-cost.
   * @param options - Candidate strategies
   * @param rates - Global shop rates
   */
  decide(options: StrategyCostOption[], rates: CostRates): StrategyCostDecision {
    if (options.length === 0) {
      throw new Error("StrategyCostOptimal.decide: at least one option required");
    }

    const breakdowns = options.map(o => this.computeCost(o, rates));
    const ranked = [...breakdowns].sort((a, b) => a.total_cost_usd - b.total_cost_usd);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const savings = round2(worst.total_cost_usd - best.total_cost_usd);

    const pctBreakdown = best.breakdown_pct;
    const dominantComponent = Object.entries({
      "cycle time": pctBreakdown.cycle_time_pct,
      "tool wear": pctBreakdown.tool_pct,
      "energy": pctBreakdown.energy_pct,
      "scrap risk": pctBreakdown.scrap_risk_pct,
    }).sort(([, a], [, b]) => b - a)[0];

    const explanation = ranked.length === 1
      ? `Only one option evaluated: '${best.strategy_id}' at $${best.total_cost_usd}.`
      : `Minimum-cost strategy: '${best.strategy_id}' at $${best.total_cost_usd} ` +
        `(savings $${savings} vs worst '${worst.strategy_id}'). ` +
        `Dominant cost component: ${dominantComponent[0]} (${dominantComponent[1]}%).`;

    return {
      ranked,
      best,
      savings_vs_worst_usd: savings,
      explanation,
    };
  }

  /**
   * Sensitivity: how much would each rate change total cost?
   * Useful for "what if energy rate doubles" questions.
   */
  sensitivity(option: StrategyCostOption, rates: CostRates, deltaPct: number = 10): {
    baseline_usd: number;
    machine_rate_delta_usd: number;
    energy_rate_delta_usd: number;
    part_value_delta_usd: number;
    most_sensitive_to: string;
  } {
    const baseline = this.computeCost(option, rates).total_cost_usd;
    const factor = 1 + deltaPct / 100;
    const machineBumped = this.computeCost(option,
      { ...rates, machine_rate_per_min_usd: rates.machine_rate_per_min_usd * factor }).total_cost_usd;
    const energyBumped = this.computeCost(option,
      { ...rates, energy_rate_per_kWh_usd: rates.energy_rate_per_kWh_usd * factor }).total_cost_usd;
    const partBumped = this.computeCost(option,
      { ...rates, part_value_usd: rates.part_value_usd * factor }).total_cost_usd;

    const machineDelta = round2(machineBumped - baseline);
    const energyDelta = round2(energyBumped - baseline);
    const partDelta = round2(partBumped - baseline);

    const sensitivities = [
      { name: "machine_rate", delta: machineDelta },
      { name: "energy_rate", delta: energyDelta },
      { name: "part_value", delta: partDelta },
    ];
    const mostSensitive = sensitivities.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

    return {
      baseline_usd: round2(baseline),
      machine_rate_delta_usd: machineDelta,
      energy_rate_delta_usd: energyDelta,
      part_value_delta_usd: partDelta,
      most_sensitive_to: mostSensitive.name,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const strategyCostOptimalEngine = new StrategyCostOptimalEngine();
