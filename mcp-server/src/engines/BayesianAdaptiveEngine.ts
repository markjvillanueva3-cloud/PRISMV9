/**
 * PRISM MCP Server — Bayesian Adaptive Calibration Engine
 *
 * Online Bayesian parameter calibration for Kienzle cutting force model.
 * Uses Normal-Inverse-Gamma conjugate prior to update kc11 (specific cutting
 * force) and mc (exponent) as new force measurements arrive in-process.
 *
 * Kienzle model: Fc = kc11 · b · h^(1−mc)
 * where h = chip thickness [mm], b = width of cut [mm].
 *
 * Linearized form: log(Fc/b) = log(kc11) + (1−mc)·log(h)
 *   → Y = β₀ + β₁·X,  β₀ = log(kc11), β₁ = 1−mc
 *
 * Conjugate update (Normal-Inverse-Gamma):
 *   β|σ² ~ N(μ₀, σ²Λ₀⁻¹),  σ² ~ IG(a₀, b₀)
 *   Posterior: Λₙ = Λ₀ + X'X,  μₙ = Λₙ⁻¹(Λ₀μ₀ + X'Y)
 *   aₙ = a₀ + n/2,  bₙ = b₀ + (Y'Y + μ₀'Λ₀μ₀ − μₙ'Λₙμₙ)/2
 *
 * References:
 *   - Kienzle, O. (1952). "Die Bestimmung von Kräften und Leistungen
 *     an spanenden Werkzeugen und Werkzeugmaschinen." VDI-Z, 94(11/12).
 *   - DeGroot, M.H. (1970). "Optimal Statistical Decisions." McGraw-Hill.
 *   - Murphy, K.P. (2007). "Conjugate Bayesian analysis of the Gaussian
 *     distribution." Technical report, UBC.
 *
 * @module BayesianAdaptiveEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BayesianObservation {
  force_N: number;
  chip_thickness_mm: number;
  width_of_cut_mm: number;
  wear_state?: number;
}

export interface BayesianPrior {
  kc11_mean?: number;
  kc11_var?: number;
  mc_mean?: number;
  mc_var?: number;
  sigma2_shape?: number;
  sigma2_scale?: number;
}

export interface BayesianAdaptiveInput {
  observations: BayesianObservation[];
  prior?: BayesianPrior;
  material_hint?: string;
  convergence_threshold?: number;
  min_observations?: number;
}

export interface BayesianAdaptiveResult {
  posterior: {
    kc11_mean: number;
    kc11_std: number;
    mc_mean: number;
    mc_std: number;
    sigma2_mean: number;
    n_observations: number;
  };
  converged: boolean;
  convergence_ratio: number;
  kc11_trend: 'stable' | 'increasing' | 'decreasing';
  kc11_drift_pct: number;
  predictions: Array<{
    predicted_force_N: number;
    actual_force_N: number;
    residual_N: number;
    log_likelihood: number;
  }>;
  credible_interval_95: { kc11: [number, number]; mc: [number, number] };
  warnings: string[];
  formula: string;
}

// ============================================================================
// MATERIAL PRIORS — Kienzle kc11 [N/mm²] and mc values from literature
// ============================================================================

const MATERIAL_PRIORS: Record<string, { kc11: number; mc: number }> = {
  aluminum:    { kc11:  700, mc: 0.23 },
  steel_1045:  { kc11: 1800, mc: 0.25 },
  stainless:   { kc11: 2100, mc: 0.25 },
  titanium:    { kc11: 2800, mc: 0.28 },
  cast_iron:   { kc11: 1100, mc: 0.28 },
  inconel:     { kc11: 2800, mc: 0.28 },
};

// ============================================================================
// 2×2 MATRIX HELPERS (no external deps)
// ============================================================================

type Mat2 = [number, number, number, number]; // row-major [a,b,c,d]

function mat2Inv(m: Mat2): Mat2 {
  const [a, b, c, d] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-15) throw new Error('Singular precision matrix — cannot invert');
  const inv = 1 / det;
  return [d * inv, -b * inv, -c * inv, a * inv];
}

function mat2MulVec(m: Mat2, v: [number, number]): [number, number] {
  return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}

function vecDot(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

// ============================================================================
// ENGINE
// ============================================================================

export class BayesianAdaptiveEngine {
  /**
   * Return material-specific Kienzle priors. Falls back to steel_1045 defaults.
   * @param material - Optional material key (e.g. "aluminum", "stainless")
   */
  defaultPrior(material?: string): BayesianPrior {
    const mat = material && MATERIAL_PRIORS[material]
      ? MATERIAL_PRIORS[material]
      : MATERIAL_PRIORS.steel_1045;
    return {
      kc11_mean: mat.kc11,
      kc11_var: 200 * 200,
      mc_mean: mat.mc,
      mc_var: 0.05 * 0.05,
      sigma2_shape: 3,
      sigma2_scale: 1000,
    };
  }

  /**
   * Kienzle cutting force: Fc = kc11 · b · h^(1−mc)
   * @param kc11 - Specific cutting force at h=1mm, b=1mm [N/mm²]
   * @param mc   - Kienzle exponent (typically 0.2–0.35)
   * @param h_mm - Chip thickness [mm]
   * @param b_mm - Width of cut [mm]
   */
  predictForce(kc11: number, mc: number, h_mm: number, b_mm: number): number {
    return kc11 * b_mm * Math.pow(h_mm, 1 - mc);
  }

  /**
   * Online Bayesian calibration of Kienzle kc11/mc from force observations.
   *
   * Transforms to linear regression: Y = log(Fc/b), X = [1, log(h)]
   * with β = [log(kc11), 1−mc]. Uses Normal-Inverse-Gamma conjugate update.
   *
   * @param input - Observations, optional prior, convergence settings
   * @returns Posterior parameters, convergence status, predictions, warnings
   */
  calibrate(input: BayesianAdaptiveInput): BayesianAdaptiveResult {
    const warnings: string[] = [];
    const convergenceThreshold = input.convergence_threshold ?? 0.1;
    const minObs = input.min_observations ?? 20;

    // ---- Resolve prior ----
    const priorSpec = {
      ...this.defaultPrior(input.material_hint),
      ...input.prior,
    };
    const kc11Mean = priorSpec.kc11_mean!;
    const kc11Var = priorSpec.kc11_var!;
    const mcMean = priorSpec.mc_mean!;
    const mcVar = priorSpec.mc_var!;
    const a0 = priorSpec.sigma2_shape!;
    const b0 = priorSpec.sigma2_scale!;

    // ---- Validate & filter observations ----
    const valid = input.observations.filter((o) => {
      if (o.force_N <= 0 || o.chip_thickness_mm <= 0 || o.width_of_cut_mm <= 0) {
        warnings.push(`Skipped non-positive observation: Fc=${o.force_N}, h=${o.chip_thickness_mm}, b=${o.width_of_cut_mm}`);
        return false;
      }
      return true;
    });

    if (valid.length < 2) {
      return this.priorOnlyResult(kc11Mean, kc11Var, mcMean, mcVar, a0, b0, warnings);
    }

    // ---- Build design matrix (linearized Kienzle) ----
    const n = valid.length;
    const Y: number[] = [];
    const X1: number[] = []; // log(h)

    for (const obs of valid) {
      Y.push(Math.log(obs.force_N / obs.width_of_cut_mm));
      X1.push(Math.log(obs.chip_thickness_mm));
    }

    // ---- Prior precision Λ₀ (2×2 diagonal from parameter variances) ----
    // β₀ = log(kc11), β₁ = 1−mc → prior variances need delta-method transform
    // Var(log(kc11)) ≈ kc11Var / kc11Mean² , Var(1−mc) = mcVar
    const logKc11Var = kc11Var / (kc11Mean * kc11Mean);
    const beta1Var = mcVar; // Var(1−mc) = Var(mc)
    // Λ₀ = diag(1/varβ₀, 1/varβ₁) — scaled by expected σ² for NIG parameterization
    const sigma2Prior = a0 > 1 ? b0 / (a0 - 1) : b0;
    const lambda0: Mat2 = [
      sigma2Prior / logKc11Var, 0,
      0, sigma2Prior / beta1Var,
    ];
    const mu0: [number, number] = [Math.log(kc11Mean), 1 - mcMean];

    // ---- Compute sufficient statistics X'X and X'Y ----
    let XtX00 = 0, XtX01 = 0, XtX11 = 0;
    let XtY0 = 0, XtY1 = 0;
    let YtY = 0;

    for (let i = 0; i < n; i++) {
      XtX00 += 1;
      XtX01 += X1[i];
      XtX11 += X1[i] * X1[i];
      XtY0 += Y[i];
      XtY1 += X1[i] * Y[i];
      YtY += Y[i] * Y[i];
    }
    const XtX: Mat2 = [XtX00, XtX01, XtX01, XtX11];

    // ---- Posterior precision Λₙ = Λ₀ + X'X ----
    const lambdaN: Mat2 = [
      lambda0[0] + XtX[0], lambda0[1] + XtX[1],
      lambda0[2] + XtX[2], lambda0[3] + XtX[3],
    ];

    // ---- Posterior mean μₙ = Λₙ⁻¹(Λ₀μ₀ + X'Y) ----
    const L0mu0 = mat2MulVec(lambda0, mu0);
    const rhs: [number, number] = [L0mu0[0] + XtY0, L0mu0[1] + XtY1];
    const lambdaNInv = mat2Inv(lambdaN);
    const muN = mat2MulVec(lambdaNInv, rhs);

    // ---- Posterior IG parameters ----
    const aN = a0 + n / 2;
    const mu0tL0mu0 = vecDot(mu0, L0mu0);
    const muNtLNmuN = vecDot(muN, mat2MulVec(lambdaN, muN));
    const bN = b0 + 0.5 * (YtY + mu0tL0mu0 - muNtLNmuN);

    if (bN <= 0) {
      warnings.push('Posterior scale bN became non-positive; data may be inconsistent with prior');
      return this.priorOnlyResult(kc11Mean, kc11Var, mcMean, mcVar, a0, b0, warnings);
    }

    // ---- Extract kc11 and mc posteriors ----
    const sigma2Mean = aN > 1 ? bN / (aN - 1) : bN;
    const betaCov0 = sigma2Mean * lambdaNInv[0]; // Var(log(kc11))
    const betaCov3 = sigma2Mean * lambdaNInv[3]; // Var(1−mc) = Var(mc)

    const postLogKc11Mean = muN[0];
    const postLogKc11Std = Math.sqrt(Math.max(betaCov0, 1e-15));
    const postMcMean = 1 - muN[1];
    const postMcStd = Math.sqrt(Math.max(betaCov3, 1e-15));

    // Back-transform: kc11 = exp(log(kc11)), propagate log-normal variance
    const postKc11Mean = Math.exp(postLogKc11Mean + betaCov0 / 2);
    const postKc11Std = postKc11Mean * Math.sqrt(Math.exp(betaCov0) - 1);

    // ---- 95% credible intervals (Student-t with 2·aN dof, approximate with z=1.96) ----
    const tFactor = aN > 30 ? 1.96 : 2.0 + 4.0 / aN; // rough t approximation
    const kc11Lo = Math.exp(postLogKc11Mean - tFactor * postLogKc11Std);
    const kc11Hi = Math.exp(postLogKc11Mean + tFactor * postLogKc11Std);
    const mcLo = postMcMean - tFactor * postMcStd;
    const mcHi = postMcMean + tFactor * postMcStd;

    // ---- Convergence check ----
    const priorKc11VarLog = logKc11Var;
    const convergenceRatio = betaCov0 / priorKc11VarLog;
    const converged = n >= minObs && convergenceRatio < convergenceThreshold;

    if (n < minObs) {
      warnings.push(`Only ${n} observations; need ${minObs} for convergence declaration`);
    }

    // ---- Predictions & residuals ----
    const predictions = valid.map((obs) => {
      const predicted = this.predictForce(postKc11Mean, postMcMean, obs.chip_thickness_mm, obs.width_of_cut_mm);
      const residual = obs.force_N - predicted;
      // Log-likelihood under Gaussian in log-space
      const logY = Math.log(obs.force_N / obs.width_of_cut_mm);
      const predLogY = postLogKc11Mean + muN[1] * Math.log(obs.chip_thickness_mm);
      const logLik = -0.5 * Math.log(2 * Math.PI * sigma2Mean)
        - 0.5 * (logY - predLogY) ** 2 / sigma2Mean;
      return {
        predicted_force_N: Math.round(predicted * 100) / 100,
        actual_force_N: obs.force_N,
        residual_N: Math.round(residual * 100) / 100,
        log_likelihood: Math.round(logLik * 1000) / 1000,
      };
    });

    // ---- Wear-aware kc11 drift tracking ----
    const { trend, driftPct } = this.assessKc11Drift(valid, postKc11Mean, postMcMean, warnings);

    // ---- Formula string ----
    const formula = `Fc = ${postKc11Mean.toFixed(1)} · b · h^(${(1 - postMcMean).toFixed(4)})  [kc11=${postKc11Mean.toFixed(1)} N/mm², mc=${postMcMean.toFixed(4)}]`;

    return {
      posterior: {
        kc11_mean: Math.round(postKc11Mean * 10) / 10,
        kc11_std: Math.round(postKc11Std * 10) / 10,
        mc_mean: Math.round(postMcMean * 10000) / 10000,
        mc_std: Math.round(postMcStd * 10000) / 10000,
        sigma2_mean: Math.round(sigma2Mean * 100) / 100,
        n_observations: n,
      },
      converged,
      convergence_ratio: Math.round(convergenceRatio * 10000) / 10000,
      kc11_trend: trend,
      kc11_drift_pct: Math.round(driftPct * 100) / 100,
      predictions,
      credible_interval_95: {
        kc11: [Math.round(kc11Lo * 10) / 10, Math.round(kc11Hi * 10) / 10],
        mc: [Math.round(mcLo * 10000) / 10000, Math.round(mcHi * 10000) / 10000],
      },
      warnings,
      formula,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /**
   * Assess kc11 drift by comparing first-half vs second-half implied kc11.
   * Rising kc11 indicates progressive tool wear increasing cutting forces.
   */
  private assessKc11Drift(
    obs: BayesianObservation[],
    kc11Post: number,
    mcPost: number,
    warnings: string[],
  ): { trend: 'stable' | 'increasing' | 'decreasing'; driftPct: number } {
    if (obs.length < 6) {
      return { trend: 'stable', driftPct: 0 };
    }

    const mid = Math.floor(obs.length / 2);
    const impliedKc11 = (o: BayesianObservation): number =>
      o.force_N / (o.width_of_cut_mm * Math.pow(o.chip_thickness_mm, 1 - mcPost));

    const firstHalf = obs.slice(0, mid);
    const secondHalf = obs.slice(mid);

    const avgFirst = firstHalf.reduce((s, o) => s + impliedKc11(o), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, o) => s + impliedKc11(o), 0) / secondHalf.length;

    const driftPct = ((avgSecond - avgFirst) / avgFirst) * 100;

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (driftPct > 5) {
      trend = 'increasing';
      if (driftPct > 15) {
        warnings.push(`kc11 drift of ${driftPct.toFixed(1)}% suggests significant tool wear — consider tool change`);
      }
    } else if (driftPct < -5) {
      trend = 'decreasing';
      warnings.push(`kc11 decreasing by ${Math.abs(driftPct).toFixed(1)}% — possible thermal softening or measurement issue`);
    }

    return { trend, driftPct };
  }

  /**
   * Return a result based purely on the prior when insufficient data is available.
   */
  private priorOnlyResult(
    kc11Mean: number, kc11Var: number,
    mcMean: number, mcVar: number,
    a0: number, b0: number,
    warnings: string[],
  ): BayesianAdaptiveResult {
    const kc11Std = Math.sqrt(kc11Var);
    const mcStd = Math.sqrt(mcVar);
    const sigma2Mean = a0 > 1 ? b0 / (a0 - 1) : b0;
    warnings.push('Insufficient observations — returning prior as posterior');
    return {
      posterior: {
        kc11_mean: kc11Mean,
        kc11_std: Math.round(kc11Std * 10) / 10,
        mc_mean: mcMean,
        mc_std: Math.round(mcStd * 10000) / 10000,
        sigma2_mean: Math.round(sigma2Mean * 100) / 100,
        n_observations: 0,
      },
      converged: false,
      convergence_ratio: 1.0,
      kc11_trend: 'stable',
      kc11_drift_pct: 0,
      predictions: [],
      credible_interval_95: {
        kc11: [Math.round((kc11Mean - 1.96 * kc11Std) * 10) / 10, Math.round((kc11Mean + 1.96 * kc11Std) * 10) / 10],
        mc: [Math.round((mcMean - 1.96 * mcStd) * 10000) / 10000, Math.round((mcMean + 1.96 * mcStd) * 10000) / 10000],
      },
      warnings,
      formula: `Fc = ${kc11Mean.toFixed(1)} · b · h^(${(1 - mcMean).toFixed(4)})  [PRIOR ONLY]`,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const bayesianAdaptiveEngine = new BayesianAdaptiveEngine();
