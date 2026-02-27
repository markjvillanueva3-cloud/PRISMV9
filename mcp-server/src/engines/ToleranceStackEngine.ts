/**
 * ToleranceStackEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Tolerance stack-up analysis: worst-case and statistical (RSS) methods.
 * Analyzes chains of dimensions to determine assembly gap/interference,
 * identifies critical contributors, and suggests tolerance tightening.
 *
 * Actions: tolerance_stack, tolerance_rss, tolerance_contributors
 */

// ============================================================================
// TYPES
// ============================================================================

export type StackMethod = "worst_case" | "rss" | "monte_carlo";

export interface StackDimension {
  id: string;
  name: string;
  nominal_mm: number;
  tolerance_plus_mm: number;
  tolerance_minus_mm: number;
  direction: "positive" | "negative";  // contributes to gap (+) or interference (-)
  distribution?: "normal" | "uniform" | "triangular";
  cpk?: number;
}

export interface StackResult {
  method: StackMethod;
  nominal_gap_mm: number;
  min_gap_mm: number;
  max_gap_mm: number;
  total_tolerance_mm: number;
  mean_gap_mm: number;
  sigma_mm: number;
  probability_interference_pct: number;
  contributors: StackContributor[];
  passes: boolean;
  min_acceptable_gap_mm: number;
}

export interface StackContributor {
  dimension_id: string;
  name: string;
  contribution_pct: number;
  sensitivity: number;               // partial derivative — how much gap changes per unit dim change
  tolerance_mm: number;
}

export interface StackOptimization {
  current_total_tolerance_mm: number;
  target_total_tolerance_mm: number;
  adjustments: { dimension_id: string; name: string; old_tol_mm: number; new_tol_mm: number }[];
  feasible: boolean;
  cost_impact_pct: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ToleranceStackEngine {
  /**
   * Worst-case tolerance stack analysis.
   * All tolerances add arithmetically — guarantees 100% assembly.
   */
  worstCase(dimensions: StackDimension[], minGap_mm: number = 0): StackResult {
    let nominalGap = 0;
    let maxGap = 0;
    let minGap = 0;
    let totalTol = 0;

    for (const d of dimensions) {
      const sign = d.direction === "positive" ? 1 : -1;
      nominalGap += sign * d.nominal_mm;
      maxGap += sign > 0 ? d.nominal_mm + d.tolerance_plus_mm : d.nominal_mm - d.tolerance_minus_mm;
      minGap += sign > 0 ? d.nominal_mm - d.tolerance_minus_mm : d.nominal_mm + d.tolerance_plus_mm;
      totalTol += d.tolerance_plus_mm + d.tolerance_minus_mm;
    }

    // If direction is negative, max/min swap — recalculate properly
    if (maxGap < minGap) { const tmp = maxGap; maxGap = minGap; minGap = tmp; }

    const contributors = this.calcContributors(dimensions, totalTol);

    return {
      method: "worst_case",
      nominal_gap_mm: Math.round(nominalGap * 10000) / 10000,
      min_gap_mm: Math.round(minGap * 10000) / 10000,
      max_gap_mm: Math.round(maxGap * 10000) / 10000,
      total_tolerance_mm: Math.round(totalTol * 10000) / 10000,
      mean_gap_mm: Math.round(nominalGap * 10000) / 10000,
      sigma_mm: Math.round((totalTol / 6) * 10000) / 10000, // estimate
      probability_interference_pct: minGap < minGap_mm ? 100 : 0,
      contributors,
      passes: minGap >= minGap_mm,
      min_acceptable_gap_mm: minGap_mm,
    };
  }

  /**
   * RSS (Root Sum Square) statistical tolerance stack.
   * Assumes normal distribution — gives ~99.73% assembly rate (3σ).
   */
  rss(dimensions: StackDimension[], minGap_mm: number = 0): StackResult {
    let nominalGap = 0;
    let varianceSum = 0;
    let totalTol = 0;

    for (const d of dimensions) {
      const sign = d.direction === "positive" ? 1 : -1;
      nominalGap += sign * d.nominal_mm;
      const tol = (d.tolerance_plus_mm + d.tolerance_minus_mm) / 2;
      const sigma = tol / 3; // assume ±3σ = tolerance
      varianceSum += sigma * sigma;
      totalTol += d.tolerance_plus_mm + d.tolerance_minus_mm;
    }

    const sigmaTotal = Math.sqrt(varianceSum);
    const minGap = nominalGap - 3 * sigmaTotal;
    const maxGap = nominalGap + 3 * sigmaTotal;

    // Probability of interference (gap < minGap_mm)
    const z = sigmaTotal > 0 ? (minGap_mm - nominalGap) / sigmaTotal : 0;
    const probInterference = sigmaTotal > 0 ? this.normalCDF(z) * 100 : (nominalGap < minGap_mm ? 100 : 0);

    const contributors = this.calcContributors(dimensions, totalTol);

    return {
      method: "rss",
      nominal_gap_mm: Math.round(nominalGap * 10000) / 10000,
      min_gap_mm: Math.round(minGap * 10000) / 10000,
      max_gap_mm: Math.round(maxGap * 10000) / 10000,
      total_tolerance_mm: Math.round(totalTol * 10000) / 10000,
      mean_gap_mm: Math.round(nominalGap * 10000) / 10000,
      sigma_mm: Math.round(sigmaTotal * 10000) / 10000,
      probability_interference_pct: Math.round(probInterference * 100) / 100,
      contributors,
      passes: minGap >= minGap_mm,
      min_acceptable_gap_mm: minGap_mm,
    };
  }

  /**
   * Identify which dimensions contribute most to stack variation.
   */
  private calcContributors(dimensions: StackDimension[], totalTol: number): StackContributor[] {
    return dimensions.map(d => {
      const dimTol = d.tolerance_plus_mm + d.tolerance_minus_mm;
      const sensitivity = d.direction === "positive" ? 1 : -1;
      return {
        dimension_id: d.id,
        name: d.name,
        contribution_pct: totalTol > 0 ? Math.round((dimTol / totalTol) * 1000) / 10 : 0,
        sensitivity,
        tolerance_mm: Math.round(dimTol * 10000) / 10000,
      };
    }).sort((a, b) => b.contribution_pct - a.contribution_pct);
  }

  /**
   * Suggest tolerance adjustments to meet target gap.
   */
  optimize(dimensions: StackDimension[], targetMinGap_mm: number): StackOptimization {
    const current = this.worstCase(dimensions, targetMinGap_mm);
    if (current.passes) {
      return {
        current_total_tolerance_mm: current.total_tolerance_mm,
        target_total_tolerance_mm: current.total_tolerance_mm,
        adjustments: [],
        feasible: true,
        cost_impact_pct: 0,
      };
    }

    // Need to tighten — reduce largest contributors first
    const sorted = [...current.contributors].sort((a, b) => b.contribution_pct - a.contribution_pct);
    const gap = current.min_gap_mm;
    const deficit = targetMinGap_mm - gap;
    let remaining = deficit;

    const adjustments: StackOptimization["adjustments"] = [];

    for (const c of sorted) {
      if (remaining <= 0) break;
      const dim = dimensions.find(d => d.id === c.dimension_id);
      if (!dim) continue;

      const currentTol = dim.tolerance_plus_mm + dim.tolerance_minus_mm;
      const reduction = Math.min(currentTol * 0.5, remaining); // reduce by up to 50%
      const newTol = currentTol - reduction;

      adjustments.push({
        dimension_id: dim.id,
        name: dim.name,
        old_tol_mm: Math.round(currentTol * 10000) / 10000,
        new_tol_mm: Math.round(newTol * 10000) / 10000,
      });

      remaining -= reduction;
    }

    const newTotal = current.total_tolerance_mm - deficit + Math.max(remaining, 0);
    // Tighter tolerance = higher cost (roughly exponential)
    const tighteningRatio = newTotal / current.total_tolerance_mm;
    const costImpact = (1 / tighteningRatio - 1) * 100;

    return {
      current_total_tolerance_mm: current.total_tolerance_mm,
      target_total_tolerance_mm: Math.round(newTotal * 10000) / 10000,
      adjustments,
      feasible: remaining <= 0,
      cost_impact_pct: Math.round(costImpact),
    };
  }

  /** Standard normal CDF approximation (Abramowitz & Stegun). */
  private normalCDF(z: number): number {
    if (z < -6) return 0;
    if (z > 6) return 1;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }
}

export const toleranceStackEngine = new ToleranceStackEngine();
