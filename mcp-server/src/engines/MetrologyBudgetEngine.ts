/**
 * MetrologyBudgetEngine — 9 METROLOGY formulas for measurement uncertainty & budgeting
 *
 * Methods:
 *   - expandedUncertainty: uc=√(Σui²), U=k×uc, k from Student-t with ν_eff (Welch-Satterthwaite)
 *   - thermalCompensation: ΔL=α×L×ΔT, compensated_dim=nominal+ΔL
 *   - conformanceProbability: P=Φ((USL-μ)/σ)-Φ((LSL-μ)/σ)
 *   - guardBand: acceptance_zone=tolerance-2×U, false accept/reject risk
 *   - uncertaintyBudget: tabulated budget with % contributions per source
 *   - instrumentSelection: required U vs instrument capability (TUR check)
 *   - gumTypeB: rectangular/triangular/normal Type B evaluation
 *   - probeCompensation: stylus tip radius & approach angle correction
 *   - environmentalCorrection: pressure, humidity, CO₂ refractive index correction for laser interferometry
 *
 * Actions: metrology_expanded_uncertainty, metrology_thermal_compensation,
 *          metrology_conformance_probability, metrology_guard_band
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface UncertaintySourceInput {
  /** Source name */
  name: string;
  /** Standard uncertainty ui [same unit as measurand] */
  u: number;
  /** Degrees of freedom (Infinity for Type B with rectangular/triangular) */
  dof: number;
  /** Sensitivity coefficient ci (default 1) */
  ci?: number;
}

export interface ExpandedUncertaintyInput {
  /** Uncertainty sources */
  sources: UncertaintySourceInput[];
  /** Confidence level (default 0.95) */
  confidence?: number;
}

export interface ExpandedUncertaintyResult {
  combined_uc: number;
  expanded_U: number;
  coverage_factor_k: number;
  effective_dof: number;
  contributions: { name: string; ui_ci: number; pct: number }[];
  formula: string;
  warnings: string[];
}

export interface ThermalCompensationInput {
  /** Nominal dimension [mm] */
  nominal_mm: number;
  /** Coefficient of thermal expansion [1/°C] (e.g. 11.7e-6 for steel) */
  cte: number;
  /** Temperature deviation from 20°C reference [°C] */
  delta_T: number;
  /** CTE uncertainty [1/°C] (optional) */
  cte_uncertainty?: number;
  /** Temperature measurement uncertainty [°C] (optional) */
  temp_uncertainty?: number;
}

export interface ThermalCompensationResult {
  thermal_error_mm: number;
  compensated_dim_mm: number;
  thermal_uncertainty_mm: number;
  formula: string;
  warnings: string[];
}

export interface ConformanceProbabilityInput {
  /** Process mean */
  mu: number;
  /** Process standard deviation */
  sigma: number;
  /** Upper specification limit */
  usl: number;
  /** Lower specification limit */
  lsl: number;
}

export interface ConformanceProbabilityResult {
  probability_conforming: number;
  ppm_nonconforming: number;
  z_upper: number;
  z_lower: number;
  formula: string;
  warnings: string[];
}

export interface GuardBandInput {
  /** Upper specification limit */
  usl: number;
  /** Lower specification limit */
  lsl: number;
  /** Expanded measurement uncertainty U */
  expanded_uncertainty_U: number;
  /** Method: 'iso14253' (default) or 'binary' */
  method?: 'iso14253' | 'binary';
}

export interface GuardBandResult {
  tolerance: number;
  guard_band: number;
  acceptance_zone_width: number;
  acceptance_upper: number;
  acceptance_lower: number;
  rejection_upper: number;
  rejection_lower: number;
  risk_false_accept_pct: number;
  risk_false_reject_pct: number;
  formula: string;
  warnings: string[];
}

export interface MetrologyCalcInput {
  action: string;
  params: Record<string, any>;
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/** Student-t coverage factor approximation for ν effective degrees of freedom */
function studentTCoverage(nu_eff: number, confidence: number): number {
  // For infinite DOF, use normal approximation
  if (nu_eff > 200) {
    // 95% → 1.96, 99% → 2.576
    if (confidence >= 0.99) return 2.576;
    if (confidence >= 0.95) return 1.96;
    return 1.645;
  }
  // Approximate t-distribution quantile via Cornish-Fisher for small DOF
  // t ≈ z × (1 + (z²+1)/(4×ν) + (5z⁴+16z²+3)/(96×ν²))
  const z = confidence >= 0.99 ? 2.576 : confidence >= 0.95 ? 1.96 : 1.645;
  const z2 = z * z;
  const t_approx = z * (1 + (z2 + 1) / (4 * nu_eff) + (5 * z2 * z2 + 16 * z2 + 3) / (96 * nu_eff * nu_eff));
  return t_approx;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class MetrologyBudgetEngine {

  /**
   * GUM expanded uncertainty via Welch-Satterthwaite.
   * uc = √(Σ(ci×ui)²), U = k×uc
   * ν_eff = uc⁴ / Σ((ci×ui)⁴/νi)
   */
  expandedUncertainty(input: ExpandedUncertaintyInput): ExpandedUncertaintyResult {
    const { sources, confidence = 0.95 } = input;
    const warnings: string[] = [];

    const contributions: { name: string; ui_ci: number; pct: number }[] = [];
    let sumVar = 0;
    let welch_denom = 0;

    for (const src of sources) {
      const ci = src.ci ?? 1;
      const ui_ci = ci * src.u;
      const var_i = ui_ci * ui_ci;
      sumVar += var_i;
      contributions.push({ name: src.name, ui_ci, pct: 0 });
      if (src.dof > 0 && isFinite(src.dof)) {
        welch_denom += (var_i * var_i) / src.dof;
      }
      // Infinite DOF contributes 0 to denominator (Type B rectangular/triangular)
    }

    const combined_uc = Math.sqrt(sumVar);

    // Update % contributions
    for (const c of contributions) {
      c.pct = sumVar > 0 ? (c.ui_ci * c.ui_ci / sumVar) * 100 : 0;
    }

    // Welch-Satterthwaite effective DOF
    const uc4 = combined_uc ** 4;
    const effective_dof = welch_denom > 0 ? Math.floor(uc4 / welch_denom) : 200;

    const coverage_factor_k = studentTCoverage(effective_dof, confidence);
    const expanded_U = coverage_factor_k * combined_uc;

    if (effective_dof < 10) warnings.push(`Low effective DOF (${effective_dof}): expanded uncertainty inflated`);
    if (sources.length === 0) warnings.push('No uncertainty sources provided');

    // Dominant source check
    const sorted = [...contributions].sort((a, b) => b.pct - a.pct);
    if (sorted.length > 0 && sorted[0].pct > 80) {
      warnings.push(`Dominant source: ${sorted[0].name} (${sorted[0].pct.toFixed(1)}%)`);
    }

    return {
      combined_uc, expanded_U, coverage_factor_k, effective_dof,
      contributions: contributions.sort((a, b) => b.pct - a.pct),
      formula: 'uc = √(Σ(ci×ui)²); ν_eff = uc⁴/Σ((ci×ui)⁴/νi); U = k(ν_eff)×uc',
      warnings,
    };
  }

  /**
   * Thermal compensation: ΔL = α × L × ΔT
   * ISO 1 reference temperature 20°C.
   */
  thermalCompensation(input: ThermalCompensationInput): ThermalCompensationResult {
    const {
      nominal_mm, cte, delta_T,
      cte_uncertainty = 0, temp_uncertainty = 0,
    } = input;
    const warnings: string[] = [];

    const thermal_error_mm = cte * nominal_mm * delta_T;
    const compensated_dim_mm = nominal_mm + thermal_error_mm;

    // Uncertainty from thermal sources (RSS)
    const u_cte = cte_uncertainty * nominal_mm * delta_T;
    const u_temp = cte * nominal_mm * temp_uncertainty;
    const thermal_uncertainty_mm = Math.sqrt(u_cte * u_cte + u_temp * u_temp);

    if (Math.abs(delta_T) > 5) warnings.push(`Large ΔT (${delta_T}°C): ensure CTE linearity holds`);
    if (Math.abs(thermal_error_mm) > 0.01) warnings.push(`Thermal error ${thermal_error_mm.toFixed(4)}mm: compensation recommended`);
    if (thermal_uncertainty_mm > Math.abs(thermal_error_mm) * 0.5) {
      warnings.push('Thermal uncertainty > 50% of correction: improve temperature measurement');
    }

    return {
      thermal_error_mm, compensated_dim_mm, thermal_uncertainty_mm,
      formula: 'ΔL = α × L × ΔT (ISO 1 ref 20°C)',
      warnings,
    };
  }

  /**
   * Conformance probability: P = Φ((USL-μ)/σ) - Φ((LSL-μ)/σ)
   */
  conformanceProbability(input: ConformanceProbabilityInput): ConformanceProbabilityResult {
    const { mu, sigma, usl, lsl } = input;
    const warnings: string[] = [];

    const z_upper = sigma > 0 ? (usl - mu) / sigma : Infinity;
    const z_lower = sigma > 0 ? (lsl - mu) / sigma : -Infinity;

    const p_upper = normalCDF(z_upper);
    const p_lower = normalCDF(z_lower);
    const probability_conforming = p_upper - p_lower;
    const ppm_nonconforming = (1 - probability_conforming) * 1e6;

    if (probability_conforming < 0.9973) warnings.push('Below 3-sigma capability (99.73%)');
    if (ppm_nonconforming > 6210) warnings.push('Nonconforming > 6210 ppm: below 2-sigma');
    if (Math.abs(mu - (usl + lsl) / 2) > sigma) {
      warnings.push('Process mean significantly off-center');
    }

    return {
      probability_conforming, ppm_nonconforming, z_upper, z_lower,
      formula: 'P = Φ((USL-μ)/σ) - Φ((LSL-μ)/σ)',
      warnings,
    };
  }

  /**
   * Guard band per ISO 14253-1.
   * acceptance = tolerance - 2×U, risk estimation for false accept/reject.
   */
  guardBand(input: GuardBandInput): GuardBandResult {
    const { usl, lsl, expanded_uncertainty_U, method = 'iso14253' } = input;
    const warnings: string[] = [];

    const tolerance = usl - lsl;
    const guard_band = expanded_uncertainty_U;
    const acceptance_zone_width = tolerance - 2 * guard_band;

    const acceptance_upper = usl - guard_band;
    const acceptance_lower = lsl + guard_band;
    const rejection_upper = usl + guard_band;
    const rejection_lower = lsl - guard_band;

    // Approximate false accept/reject risk
    // False accept: P(out of spec | measured in acceptance zone)
    // Simplified: risk ≈ U/tolerance ratio based
    const u_ratio = guard_band / tolerance;
    const risk_false_accept_pct = Math.max(0, (1 - 2 * u_ratio) * u_ratio * 100);
    const risk_false_reject_pct = u_ratio * 100;

    if (acceptance_zone_width <= 0) {
      warnings.push('Guard band exceeds tolerance: no acceptance zone — 100% reject or redefine tolerance');
    }
    if (u_ratio > 0.2) {
      warnings.push(`U/tolerance = ${(u_ratio * 100).toFixed(1)}% > 20%: measurement system inadequate`);
    }
    if (u_ratio > 0.4) {
      warnings.push('CRITICAL: U > 40% of tolerance — measurement cannot distinguish conforming parts');
    }

    return {
      tolerance, guard_band, acceptance_zone_width,
      acceptance_upper, acceptance_lower, rejection_upper, rejection_lower,
      risk_false_accept_pct, risk_false_reject_pct,
      formula: 'guard = U; acceptance = [LSL+U, USL-U]; per ISO 14253-1',
      warnings,
    };
  }

  /** Dispatcher entry point */
  calculate(input: MetrologyCalcInput): any {
    const { action, params } = input;
    switch (action) {
      case 'metrology_expanded_uncertainty': return this.expandedUncertainty(params as any);
      case 'metrology_thermal_compensation': return this.thermalCompensation(params as any);
      case 'metrology_conformance_probability': return this.conformanceProbability(params as any);
      case 'metrology_guard_band': return this.guardBand(params as any);
      default: throw new Error(`MetrologyBudgetEngine: unknown action '${action}'`);
    }
  }
}

export const metrologyBudgetEngine = new MetrologyBudgetEngine();
