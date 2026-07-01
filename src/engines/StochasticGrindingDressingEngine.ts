/**
 * StochasticGrindingDressingEngine — Wheel Life & Dressing Optimization Under Uncertainty
 *
 * Extends grinding physics with stochastic wheel wear and dressing economics.
 * G-ratio (material removed / wheel consumed) follows log-normal distribution
 * due to grain fracture statistics and bond post variability.
 *
 * Physics models:
 * - G-ratio: G = V_material / V_wheel (log-normal, CV 15-30%)
 * - Wheel life: N_parts = G · V_wheel_available / V_material_per_part
 * - Surface roughness: Ra ∝ (ae·Vw/Vs)^β · f(dress_state)
 * - Dressing cost: C_dress = t_dress · C_machine_hr + C_diamond_amortized
 * - Cost per part: C_part = C_cycle + C_dress/N_interval + C_wheel/N_total
 *
 * References:
 * - Malkin & Guo (2008): Grinding Technology, 2nd Ed
 * - Marinescu et al. (2004): Tribology of Abrasive Machining
 * - Rowe (2009): Principles of Modern Grinding Technology
 *
 * Actions: stochastic_grinding_mc, stochastic_grinding_optimize (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface WheelLifeInput {
  /** Wheel specification string (e.g., "46A60K5V") */
  wheel_spec: string;
  /** Workpiece material */
  material: "steel" | "stainless" | "inconel" | "titanium"
    | "cast_iron" | "carbide" | "aluminum";
  /** Depth of cut (mm) */
  depth_mm: number;
  /** Wheel speed (m/s) */
  speed_mps: number;
  /** Wheel diameter (mm) — for volume calculation */
  wheel_diameter_mm?: number;
  /** Wheel width (mm) */
  wheel_width_mm?: number;
  /** Part removal volume per part (mm³) — if known */
  volume_per_part_mm3?: number;
  /** G-ratio coefficient of variation (fraction) */
  g_ratio_cov?: number;
  /** Monte Carlo samples */
  n_samples?: number;
}

export interface WheelLifeDistribution {
  mean_parts: number;
  std: number;
  p5: number;
  p95: number;
}

export interface WheelLifeResult {
  wheel_life_distribution: WheelLifeDistribution;
  dressing_interval_ci: [number, number];
  cost_per_part_distribution: { mean: number; std: number };
  g_ratio_used: number;
  formula: string;
}

export interface DressingOptimizationInput {
  base_params: WheelLifeInput;
  /** Target surface roughness (µm) */
  target_Ra_um: number;
  /** Cost penalty for re-dress ($/event) */
  cost_penalty_for_redress: number;
  /** Risk tolerance: probability of exceeding Ra target (0-1) */
  risk_tolerance: number;
  /** Machine hourly rate ($/hr) */
  machine_rate_hr?: number;
  /** Cycle time per part (seconds) */
  cycle_time_s?: number;
}

export interface DressingOptimizationResult {
  optimal_interval_parts: number;
  expected_cost: number;
  probability_of_Ra_exceedance: number;
  risk_adjusted_recommendation: string;
  cost_breakdown: {
    cycle_cost: number;
    dress_cost_amortized: number;
    wheel_cost_amortized: number;
  };
  formula: string;
}

// ── Material G-ratio database ──────────────────────────────────────────

interface MatGrinding {
  g_ratio_nominal: number;  // typical G-ratio
  Ra_base_um: number;       // baseline Ra at standard conditions
  specific_energy_J_mm3: number;
}

const MAT_GRINDING: Record<string, MatGrinding> = {
  steel:     { g_ratio_nominal: 40,  Ra_base_um: 0.4, specific_energy_J_mm3: 40 },
  stainless: { g_ratio_nominal: 25,  Ra_base_um: 0.5, specific_energy_J_mm3: 55 },
  inconel:   { g_ratio_nominal: 8,   Ra_base_um: 0.6, specific_energy_J_mm3: 70 },
  titanium:  { g_ratio_nominal: 12,  Ra_base_um: 0.55, specific_energy_J_mm3: 60 },
  cast_iron: { g_ratio_nominal: 60,  Ra_base_um: 0.35, specific_energy_J_mm3: 30 },
  carbide:   { g_ratio_nominal: 3,   Ra_base_um: 0.3, specific_energy_J_mm3: 90 },
  aluminum:  { g_ratio_nominal: 80,  Ra_base_um: 0.3, specific_energy_J_mm3: 20 },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class StochasticGrindingDressingEngine {

  /** Box-Muller normal random */
  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Log-normal sample from mean and CV */
  private sampleLogNormal(mean: number, cv: number): number {
    const sigma = Math.sqrt(Math.log(1 + cv * cv));
    const mu = Math.log(mean) - 0.5 * sigma * sigma;
    return Math.exp(mu + sigma * this.normalRandom());
  }

  /** Normal sample clamped to positive */
  private sampleNormal(mean: number, cv: number): number {
    return Math.max(mean * 0.05, mean * (1 + cv * this.normalRandom()));
  }

  /**
   * Surface roughness model:
   * Ra = Ra_base · (ae/ae_ref)^0.35 · (1 + 0.003·parts_since_dress)
   * Roughness increases with depth and wheel dulling.
   */
  private predictRa(
    raBase: number, depth: number, partsSinceDress: number,
  ): number {
    const aeRef = 0.02; // reference depth of cut (mm)
    const depthEffect = Math.pow(
      Math.max(depth, 0.001) / aeRef, 0.35,
    );
    const wearEffect = 1 + 0.003 * partsSinceDress;
    return raBase * depthEffect * wearEffect;
  }

  /**
   * Monte Carlo wheel life simulation.
   * G-ratio sampled from log-normal; wheel life = G · V_wheel / V_part.
   */
  monteCarloWheelLife(input: WheelLifeInput): WheelLifeResult {
    const mat = MAT_GRINDING[input.material] || MAT_GRINDING.steel;
    const nSamples = input.n_samples || 1000;
    const gCov = input.g_ratio_cov ?? 0.20;
    const gNom = mat.g_ratio_nominal;

    // Wheel volume available (assume 30% of total wheel can be consumed)
    const wheelDia = input.wheel_diameter_mm || 200;
    const wheelWidth = input.wheel_width_mm || 20;
    const usableFraction = 0.30;
    const wheelVolume = Math.PI * ((wheelDia / 2) ** 2
      - ((wheelDia / 2) - wheelDia * 0.15) ** 2)
      * wheelWidth * usableFraction;

    // Material volume removed per part
    const volPerPart = input.volume_per_part_mm3
      || (input.depth_mm * wheelWidth * 50); // rough estimate

    const lifeValues: number[] = [];
    const costValues: number[] = [];

    // Cost parameters
    const wheelCost = 150; // typical wheel cost $
    const dressTime_s = 30;
    const machineRate = 85; // $/hr

    for (let i = 0; i < nSamples; i++) {
      const G = this.sampleLogNormal(gNom, gCov);
      const wheelWearPerPart = volPerPart / Math.max(G, 0.1);
      const totalParts = Math.floor(wheelVolume / Math.max(wheelWearPerPart, 0.001));
      lifeValues.push(Math.max(1, totalParts));

      // Cost per part: wheel amortized + cycle
      const wheelCostPart = wheelCost / Math.max(totalParts, 1);
      const cycleCost = (volPerPart / (input.depth_mm * wheelWidth
        * input.speed_mps * 60)) * (machineRate / 3600);
      costValues.push(wheelCostPart + cycleCost);
    }

    const sorted = [...lifeValues].sort((a, b) => a - b);
    const mean = lifeValues.reduce((s, v) => s + v, 0) / nSamples;
    const variance = lifeValues.reduce((s, v) => s + (v - mean) ** 2, 0)
      / (nSamples - 1);

    const costMean = costValues.reduce((s, v) => s + v, 0) / nSamples;
    const costVar = costValues.reduce((s, v) => s + (v - costMean) ** 2, 0)
      / (nSamples - 1);

    // Dressing interval: typically 10-20% of wheel life
    const dressInterval_p5 = sorted[Math.floor(nSamples * 0.05)] * 0.12;
    const dressInterval_p95 = sorted[Math.floor(nSamples * 0.95)] * 0.18;

    return {
      wheel_life_distribution: {
        mean_parts: mean,
        std: Math.sqrt(variance),
        p5: sorted[Math.floor(nSamples * 0.05)],
        p95: sorted[Math.floor(nSamples * 0.95)],
      },
      dressing_interval_ci: [
        Math.max(1, Math.round(dressInterval_p5)),
        Math.max(1, Math.round(dressInterval_p95)),
      ],
      cost_per_part_distribution: {
        mean: costMean,
        std: Math.sqrt(costVar),
      },
      g_ratio_used: gNom,
      formula: "G=V_material/V_wheel (log-normal), Life=G·V_wheel_avail/V_part",
    };
  }

  /**
   * Optimize dressing interval under uncertainty.
   * Balances Ra exceedance risk against dressing cost.
   */
  optimizeDressingUnderUncertainty(
    input: DressingOptimizationInput,
  ): DressingOptimizationResult {
    const mat = MAT_GRINDING[input.base_params.material] || MAT_GRINDING.steel;
    const nSamples = input.base_params.n_samples || 500;
    const machineRate = input.machine_rate_hr || 85;
    const cycleTime = input.cycle_time_s || 30;
    const dressCost = input.cost_penalty_for_redress;
    const targetRa = input.target_Ra_um;
    const riskTol = input.risk_tolerance;

    // Get wheel life for cost baseline
    const lifeResult = this.monteCarloWheelLife(input.base_params);
    const wheelCost = 150;
    const totalLife = lifeResult.wheel_life_distribution.mean_parts;

    // Search for optimal dressing interval
    const candidates = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200];
    let bestInterval = 10;
    let bestCost = Infinity;
    let bestRaExceedance = 1.0;

    for (const interval of candidates) {
      if (interval > totalLife) continue;

      // Simulate Ra at end of each dressing interval
      let raExceedCount = 0;
      for (let i = 0; i < nSamples; i++) {
        // Ra at end of interval with scatter
        const raBase = this.sampleNormal(mat.Ra_base_um, 0.10);
        const raPredicted = this.predictRa(
          raBase, input.base_params.depth_mm, interval,
        );
        if (raPredicted > targetRa) raExceedCount++;
      }
      const pExceed = raExceedCount / nSamples;

      // Total cost per part
      const dressesPerWheel = Math.floor(totalLife / interval);
      const dressCostPart = (dressCost * dressesPerWheel) / totalLife;
      const wheelCostPart = wheelCost / totalLife;
      const cycleCostPart = (cycleTime / 3600) * machineRate;
      const totalCostPart = dressCostPart + wheelCostPart + cycleCostPart;

      // Penalize if exceeds risk tolerance
      const penalizedCost = pExceed > riskTol
        ? totalCostPart * (1 + 5 * (pExceed - riskTol))
        : totalCostPart;

      if (penalizedCost < bestCost) {
        bestCost = penalizedCost;
        bestInterval = interval;
        bestRaExceedance = pExceed;
      }
    }

    // Cost breakdown for best interval
    const dressesPerWheel = Math.floor(totalLife / bestInterval);
    const dressCostPart = (dressCost * dressesPerWheel) / totalLife;
    const wheelCostPart = wheelCost / totalLife;
    const cycleCostPart = (cycleTime / 3600) * machineRate;

    let recommendation: string;
    if (bestRaExceedance <= riskTol * 0.5) {
      recommendation = `Dress every ${bestInterval} parts — well within risk tolerance `
        + `(P(Ra>${targetRa}µm)=${(bestRaExceedance * 100).toFixed(1)}% vs ${(riskTol * 100).toFixed(1)}% allowed)`;
    } else if (bestRaExceedance <= riskTol) {
      recommendation = `Dress every ${bestInterval} parts — meets risk tolerance `
        + `(P(Ra>${targetRa}µm)=${(bestRaExceedance * 100).toFixed(1)}%)`;
    } else {
      recommendation = `WARNING: Even at ${bestInterval}-part intervals, `
        + `Ra exceedance (${(bestRaExceedance * 100).toFixed(1)}%) exceeds tolerance `
        + `(${(riskTol * 100).toFixed(1)}%). Reduce depth or speed.`;
    }

    return {
      optimal_interval_parts: bestInterval,
      expected_cost: dressCostPart + wheelCostPart + cycleCostPart,
      probability_of_Ra_exceedance: bestRaExceedance,
      risk_adjusted_recommendation: recommendation,
      cost_breakdown: {
        cycle_cost: cycleCostPart,
        dress_cost_amortized: dressCostPart,
        wheel_cost_amortized: wheelCostPart,
      },
      formula: "Ra=Ra_base·(ae/ae_ref)^0.35·(1+0.003·N), "
        + "C_total=C_cycle+C_dress/N_interval+C_wheel/N_total",
    };
  }
}

export const stochasticGrindingDressingEngine = new StochasticGrindingDressingEngine();
