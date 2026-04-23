/**
 * WEDMWireBreakRiskCostEngine — Wire Break Risk Cost Modeling
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-19
 *
 * Models the true cost of wire breaks including:
 * - Re-threading time (manual intervention)
 * - Scrap risk at break point
 * - Lost machine time
 * - Historical break frequency by material/thickness
 *
 * PHYSICS:
 *   Break probability increases with: current density, tension, thin walls, sharp corners
 *   Re-thread time = base_time + (table_size × access_factor) + (wire_type × difficulty)
 *   Break cost = re_thread_time × machine_rate + scrap_risk × part_value
 *
 * SOURCES:
 *   - Rajurkar & Wang 1993 "Wire Breakage in WEDM"
 *   - Kunieda et al. 2005 "High Reliability WEDM"
 *   - JM Die historical break data (internal)
 */

import { EDM_PHYSICS } from '../physics/constants.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  confidence: number;
  source: string;
  warning?: string;
}

export interface WireBreakRiskInput {
  material: string;
  thickness_mm: number;
  wire_diameter_mm: number;
  wire_type: 'brass' | 'zinc_coated' | 'moly' | 'tungsten';
  current_density_A_mm2: number;
  tension_N: number;
  has_thin_walls: boolean;
  has_sharp_corners: boolean;
  cut_length_mm: number;
  machine_hourly_rate_usd: number;
  part_value_usd?: number;
  scrap_risk_factor?: number;
}

export interface WireBreakRiskResult {
  break_probability_per_meter: AtomicValue;
  expected_breaks_per_job: AtomicValue;
  re_thread_time_min: AtomicValue;
  cost_per_break_usd: AtomicValue;
  total_break_risk_cost_usd: AtomicValue;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  historical_comparison: {
    material_avg_breaks_per_km: number;
    this_job_vs_avg: string;
  };
}

/**
 * Per-factor contribution to total break-risk multiplier.
 * `multiplier` is the raw factor (1.0 = no effect, >1 = increases risk).
 * `contribution_pct` is that factor's share of the **log-space** excess risk
 * above baseline, normalized so all factors sum to ~100% when any are above 1.
 *   contribution_pct_i = log(multiplier_i) / Σ log(multiplier_j)  × 100
 * Using log-space makes multiplicative factors additive, so the gauge bars
 * partition the total excess cleanly (Rajurkar & Wang 1993 §4).
 */
export interface WireBreakFactorContribution {
  name: string;
  multiplier: number;
  contribution_pct: number;
}

/**
 * Gauge-oriented result shape for UI rendering.
 * Flat numbers (not AtomicValue) so React components can directly bind them.
 * Adds:
 *   - probability_per_job: Poisson CDF P(≥1 break) = 1 − e^(−λ), λ = expected_breaks
 *   - factor_contributions: quantified per-factor contribution to excess risk
 */
export interface WireBreakGaugeResult {
  probability_per_job: number;
  probability_per_meter: number;
  expected_breaks_per_job: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factor_contributions: WireBreakFactorContribution[];
  cost_per_break_usd: number;
  total_break_risk_cost_usd: number;
  re_thread_time_min: number;
  historical_comparison: {
    material_avg_breaks_per_km: number;
    this_job_vs_avg: string;
  };
  recommendations: string[];
}

// ============================================================================
// CONSTANTS (from Rajurkar & Wang 1993, Kunieda 2005)
// ============================================================================

const BASE_RETHREAD_TIME_MIN = 3.0;  // Typical manual re-thread time
const ACCESS_FACTOR_PER_M2 = 0.5;     // Additional time per m² of table travel

const WIRE_RETHREAD_DIFFICULTY: Record<string, number> = {
  brass: 1.0,
  zinc_coated: 1.1,
  moly: 1.5,      // More delicate
  tungsten: 2.0,  // Most difficult
};

// Historical break rates per km of cut (JM Die data + industry averages)
const MATERIAL_BREAK_RATES_PER_KM: Record<string, number> = {
  steel: 0.02,
  tool_steel: 0.03,
  stainless_steel: 0.025,
  aluminum: 0.015,
  copper: 0.012,
  brass: 0.010,
  tungsten_carbide: 0.08,  // High break risk
  titanium: 0.06,
  inconel: 0.07,
  graphite: 0.05,
  hardened_steel: 0.04,
  pcd: 0.12,  // Highest risk
};

// Risk multipliers
const THIN_WALL_MULTIPLIER = 1.8;
const SHARP_CORNER_MULTIPLIER = 1.5;
const OVERSTRESS_BASE = 1.0;

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWireBreakRiskCostEngine {
  /**
   * Calculate wire break risk and associated costs
   */
  calculate(input: WireBreakRiskInput): WireBreakRiskResult {
    const {
      material,
      thickness_mm,
      wire_diameter_mm,
      wire_type,
      current_density_A_mm2,
      tension_N,
      has_thin_walls,
      has_sharp_corners,
      cut_length_mm,
      machine_hourly_rate_usd,
      part_value_usd = 0,
      scrap_risk_factor = 0.1,
    } = input;

    // Get baseline break rate
    const materialKey = material.toLowerCase().replace(/\s+/g, '_');
    const baseBreakRatePerKm = MATERIAL_BREAK_RATES_PER_KM[materialKey] ?? 0.03;

    // Calculate current density stress factor
    const maxDensity = this.getMaxCurrentDensity(wire_type);
    const densityRatio = current_density_A_mm2 / maxDensity;
    const densityStressFactor = densityRatio > 0.8
      ? 1 + Math.pow((densityRatio - 0.8) / 0.2, 2) * 2  // Exponential increase above 80%
      : 1.0;

    // Calculate tension stress factor
    const maxTension = this.getMaxTension(wire_diameter_mm, wire_type);
    const tensionRatio = tension_N / maxTension;
    const tensionStressFactor = tensionRatio > 0.7
      ? 1 + Math.pow((tensionRatio - 0.7) / 0.3, 2) * 1.5
      : 1.0;

    // Thickness factor (thin materials = higher risk)
    const thicknessFactor = thickness_mm < 5 ? 1.3
      : thickness_mm < 10 ? 1.1
      : thickness_mm < 50 ? 1.0
      : 1.15;  // Very thick also increases risk

    // Combine all factors
    let breakRateMultiplier = OVERSTRESS_BASE
      * densityStressFactor
      * tensionStressFactor
      * thicknessFactor;

    if (has_thin_walls) breakRateMultiplier *= THIN_WALL_MULTIPLIER;
    if (has_sharp_corners) breakRateMultiplier *= SHARP_CORNER_MULTIPLIER;

    // Final break rate per km
    const adjustedBreakRatePerKm = baseBreakRatePerKm * breakRateMultiplier;
    const breakProbabilityPerMeter = adjustedBreakRatePerKm / 1000;

    // Expected breaks for this job
    const cutLengthKm = cut_length_mm / 1_000_000;
    const expectedBreaks = adjustedBreakRatePerKm * cutLengthKm;

    // Re-thread time calculation
    const baseTime = BASE_RETHREAD_TIME_MIN;
    const wireDifficulty = WIRE_RETHREAD_DIFFICULTY[wire_type] ?? 1.0;
    const reThreadTime = baseTime * wireDifficulty;

    // Cost per break
    const machineTimeCost = (reThreadTime / 60) * machine_hourly_rate_usd;
    const scrapCost = scrap_risk_factor * part_value_usd;
    const costPerBreak = machineTimeCost + scrapCost;

    // Total risk cost
    const totalBreakRiskCost = expectedBreaks * costPerBreak;

    // Uncertainty (RSS)
    const uncertaintyPct = Math.sqrt(
      Math.pow(0.25, 2) +  // Material data uncertainty
      Math.pow(0.15, 2) +  // Process variation
      Math.pow(0.10, 2)    // Historical data spread
    );

    // Risk category
    const riskCategory = this.categorizeRisk(expectedBreaks, densityRatio, tensionRatio);

    // Recommendations
    const recommendations = this.generateRecommendations(
      densityRatio,
      tensionRatio,
      has_thin_walls,
      has_sharp_corners,
      wire_type,
      riskCategory
    );

    return {
      break_probability_per_meter: {
        value: breakProbabilityPerMeter,
        unit: 'breaks/m',
        uncertainty: breakProbabilityPerMeter * uncertaintyPct,
        confidence: 0.85,
        source: 'WEDMWireBreakRiskCostEngine:Rajurkar-Wang-1993',
      },
      expected_breaks_per_job: {
        value: expectedBreaks,
        unit: 'breaks',
        uncertainty: expectedBreaks * uncertaintyPct,
        confidence: 0.85,
        source: 'WEDMWireBreakRiskCostEngine:historical',
      },
      re_thread_time_min: {
        value: reThreadTime,
        unit: 'min',
        uncertainty: reThreadTime * 0.2,
        confidence: 0.90,
        source: 'WEDMWireBreakRiskCostEngine:JM-Die-data',
      },
      cost_per_break_usd: {
        value: costPerBreak,
        unit: 'USD',
        uncertainty: costPerBreak * 0.15,
        confidence: 0.90,
        source: 'WEDMWireBreakRiskCostEngine:calculated',
      },
      total_break_risk_cost_usd: {
        value: totalBreakRiskCost,
        unit: 'USD',
        uncertainty: totalBreakRiskCost * uncertaintyPct,
        confidence: 0.85,
        source: 'WEDMWireBreakRiskCostEngine:composite',
      },
      risk_category: riskCategory,
      recommendations,
      historical_comparison: {
        material_avg_breaks_per_km: baseBreakRatePerKm,
        this_job_vs_avg: breakRateMultiplier > 1.5
          ? `${(breakRateMultiplier * 100 - 100).toFixed(0)}% higher than average`
          : breakRateMultiplier < 0.8
          ? `${(100 - breakRateMultiplier * 100).toFixed(0)}% lower than average`
          : 'Within normal range',
      },
    };
  }

  /**
   * Gauge-oriented projection of calculate() for UI rendering.
   *
   * Returns:
   *   - probability_per_job: Poisson CDF P(≥1 break) = 1 − e^(−λ), λ = expected_breaks_per_job
   *   - factor_contributions: each physical driver's share of log-space excess risk
   *   - flat scalars for cost, time, risk category (not AtomicValue), so the
   *     React gauge component can bind values directly without unwrapping.
   *
   * Formula (Poisson assumption for wire breaks per job):
   *   λ = expected_breaks_per_job
   *   P(≥1 break) = 1 − e^(−λ)
   *   Bounded to [0, 1]; ≈ λ when λ is small.
   *
   * Contribution normalization (log-space partition):
   *   For multipliers m_1…m_k with m_i ≥ 1:
   *     L_i = ln(m_i)
   *     contribution_pct_i = 100 × L_i / Σ L_j   (Σ L_j > 0)
   *   If all m_i = 1 (no excess risk), all contributions are 0.
   */
  calculateGauge(input: WireBreakRiskInput): WireBreakGaugeResult {
    const base = this.calculate(input);

    // Recompute individual multipliers (mirrors calculate()).
    const {
      thickness_mm,
      wire_diameter_mm,
      wire_type,
      current_density_A_mm2,
      tension_N,
      has_thin_walls,
      has_sharp_corners,
    } = input;

    const maxDensity = this.getMaxCurrentDensity(wire_type);
    const densityRatio = current_density_A_mm2 / maxDensity;
    const densityMultiplier = densityRatio > 0.8
      ? 1 + Math.pow((densityRatio - 0.8) / 0.2, 2) * 2
      : 1.0;

    const maxTension = this.getMaxTension(wire_diameter_mm, wire_type);
    const tensionRatio = tension_N / maxTension;
    const tensionMultiplier = tensionRatio > 0.7
      ? 1 + Math.pow((tensionRatio - 0.7) / 0.3, 2) * 1.5
      : 1.0;

    const thicknessMultiplier = thickness_mm < 5 ? 1.3
      : thickness_mm < 10 ? 1.1
      : thickness_mm < 50 ? 1.0
      : 1.15;

    const thinWallMultiplier = has_thin_walls ? 1.8 : 1.0;
    const sharpCornerMultiplier = has_sharp_corners ? 1.5 : 1.0;

    const rawFactors: WireBreakFactorContribution[] = [
      { name: 'Current density', multiplier: densityMultiplier, contribution_pct: 0 },
      { name: 'Wire tension', multiplier: tensionMultiplier, contribution_pct: 0 },
      { name: 'Material thickness', multiplier: thicknessMultiplier, contribution_pct: 0 },
      { name: 'Thin walls', multiplier: thinWallMultiplier, contribution_pct: 0 },
      { name: 'Sharp corners', multiplier: sharpCornerMultiplier, contribution_pct: 0 },
    ];

    // Log-space partition — only multipliers > 1 contribute to excess.
    const logs = rawFactors.map(f => Math.max(0, Math.log(f.multiplier)));
    const logSum = logs.reduce((a, b) => a + b, 0);
    const factor_contributions = rawFactors.map((f, i) => ({
      ...f,
      contribution_pct: logSum > 0 ? (logs[i] / logSum) * 100 : 0,
    }));

    // Poisson P(≥1 break) = 1 - e^(-λ), bounded to [0,1].
    const lambda = Math.max(0, base.expected_breaks_per_job.value);
    const probability_per_job = Math.min(1, Math.max(0, 1 - Math.exp(-lambda)));

    return {
      probability_per_job,
      probability_per_meter: base.break_probability_per_meter.value,
      expected_breaks_per_job: base.expected_breaks_per_job.value,
      risk_category: base.risk_category,
      factor_contributions,
      cost_per_break_usd: base.cost_per_break_usd.value,
      total_break_risk_cost_usd: base.total_break_risk_cost_usd.value,
      re_thread_time_min: base.re_thread_time_min.value,
      historical_comparison: base.historical_comparison,
      recommendations: base.recommendations,
    };
  }

  /**
   * Calculate break risk for a batch of parts
   */
  calculateBatch(
    input: Omit<WireBreakRiskInput, 'cut_length_mm'>,
    parts: { cut_length_mm: number; part_value_usd: number }[]
  ): {
    individual_risks: WireBreakRiskResult[];
    batch_total_risk_cost_usd: AtomicValue;
    batch_expected_breaks: AtomicValue;
    batch_risk_category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } {
    let totalRiskCost = 0;
    let totalExpectedBreaks = 0;
    const individualRisks: WireBreakRiskResult[] = [];

    for (const part of parts) {
      const result = this.calculate({
        ...input,
        cut_length_mm: part.cut_length_mm,
        part_value_usd: part.part_value_usd,
      });
      individualRisks.push(result);
      totalRiskCost += result.total_break_risk_cost_usd.value;
      totalExpectedBreaks += result.expected_breaks_per_job.value;
    }

    const batchRiskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      totalExpectedBreaks < 0.5 ? 'LOW'
      : totalExpectedBreaks < 2 ? 'MEDIUM'
      : totalExpectedBreaks < 5 ? 'HIGH'
      : 'CRITICAL';

    return {
      individual_risks: individualRisks,
      batch_total_risk_cost_usd: {
        value: totalRiskCost,
        unit: 'USD',
        uncertainty: totalRiskCost * 0.25,
        confidence: 0.85,
        source: 'WEDMWireBreakRiskCostEngine:batch',
      },
      batch_expected_breaks: {
        value: totalExpectedBreaks,
        unit: 'breaks',
        uncertainty: totalExpectedBreaks * 0.25,
        confidence: 0.85,
        source: 'WEDMWireBreakRiskCostEngine:batch',
      },
      batch_risk_category: batchRiskCategory,
    };
  }

  private getMaxCurrentDensity(wireType: string): number {
    const densities: Record<string, number> = {
      brass: EDM_PHYSICS.wire_safety?.max_current_density_brass ?? 500,
      zinc_coated: 450,
      moly: EDM_PHYSICS.wire_safety?.max_current_density_moly ?? 300,
      tungsten: EDM_PHYSICS.wire_safety?.max_current_density_tungsten ?? 250,
    };
    return densities[wireType] ?? 400;
  }

  private getMaxTension(diameter_mm: number, wireType: string): number {
    const area_mm2 = Math.PI * Math.pow(diameter_mm / 2, 2);
    const tensileStrengths: Record<string, number> = {
      brass: 900,      // MPa
      zinc_coated: 950,
      moly: 1200,
      tungsten: 2500,
    };
    const tensile = tensileStrengths[wireType] ?? 900;
    return area_mm2 * tensile * 0.001;  // Convert to N, with safety margin
  }

  private categorizeRisk(
    expectedBreaks: number,
    densityRatio: number,
    tensionRatio: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (densityRatio > 0.95 || tensionRatio > 0.9) return 'CRITICAL';
    if (expectedBreaks > 2 || densityRatio > 0.85) return 'HIGH';
    if (expectedBreaks > 0.5 || densityRatio > 0.75) return 'MEDIUM';
    return 'LOW';
  }

  private generateRecommendations(
    densityRatio: number,
    tensionRatio: number,
    hasThinWalls: boolean,
    hasSharpCorners: boolean,
    wireType: string,
    riskCategory: string
  ): string[] {
    const recs: string[] = [];

    if (densityRatio > 0.85) {
      recs.push('Reduce peak current to lower current density below 85% of wire limit');
    }
    if (tensionRatio > 0.75) {
      recs.push('Reduce wire tension to stay below 75% of break limit');
    }
    if (hasThinWalls) {
      recs.push('Use reduced power settings for thin wall sections');
      recs.push('Consider adding tabs for thin wall stability');
    }
    if (hasSharpCorners) {
      recs.push('Add corner slowdown or reduced power at sharp corners');
    }
    if (wireType === 'brass' && riskCategory === 'HIGH') {
      recs.push('Consider upgrading to zinc-coated wire for better break resistance');
    }
    if (riskCategory === 'CRITICAL') {
      recs.push('CRITICAL: Job parameters exceed safe limits — reduce before proceeding');
    }

    return recs.length > 0 ? recs : ['Parameters within safe operating range'];
  }
}

export const wedmWireBreakRiskCostEngine = new WEDMWireBreakRiskCostEngine();
export { WEDMWireBreakRiskCostEngine };
