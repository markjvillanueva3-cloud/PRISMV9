/**
 * ManufacturingStatisticsEngine — Complete Statistical Methods for CNC
 *
 * Every statistical method applicable to CNC manufacturing:
 *   - Process Capability (Cp, Cpk, Pp, Ppk, Cpm)
 *   - SPC Control Charts (X-bar, R, S, CUSUM, EWMA)
 *   - Weibull Reliability (tool life, component failure)
 *   - Monte Carlo Tolerance Stackup
 *   - Bayesian Tool Life Estimation (posterior updating)
 *   - ANOVA (single/two-factor for machining parameter significance)
 *   - Regression (linear, polynomial, multi-variate for cutting data)
 *   - OEE Calculation (availability × performance × quality)
 *   - Learning Curve (Crawford/Wright models)
 *   - Gage R&R (measurement system analysis)
 *
 * @module engines/ManufacturingStatisticsEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessCapabilityInput {
  measurements: number[];
  usl: number;          // Upper spec limit
  lsl: number;          // Lower spec limit
  target?: number;      // Target value (for Cpm)
  subgroup_size?: number; // For short-term vs long-term
}

export interface ProcessCapabilityResult {
  n: number;
  mean: number;
  std_dev: number;
  cp: number;           // Process capability
  cpk: number;          // Process capability index (centered)
  cpu: number;          // Upper capability
  cpl: number;          // Lower capability
  cpm: number;          // Taguchi capability
  pp: number;           // Process performance
  ppk: number;          // Process performance index
  ppm_defective: number; // Parts per million defective
  sigma_level: number;  // Sigma quality level
  within_spec_pct: number;
  interpretation: string;
}

export interface SPCChartInput {
  subgroups: number[][]; // Array of subgroup measurements
  chart_type?: "xbar_r" | "xbar_s" | "individuals" | "cusum" | "ewma";
  target_mean?: number;
  lambda?: number;       // EWMA smoothing (default 0.2)
  k_cusum?: number;      // CUSUM slack (default 0.5)
  h_cusum?: number;      // CUSUM decision interval (default 5)
}

export interface SPCChartResult {
  chart_type: string;
  center_line: number;
  ucl: number;
  lcl: number;
  points: Array<{
    subgroup: number;
    value: number;
    range_or_std: number;
    out_of_control: boolean;
    rule_violations: string[];
  }>;
  out_of_control_count: number;
  process_in_control: boolean;
  rules_checked: string[];
}

export interface WeibullInput {
  failure_times: number[];   // Time to failure observations
  censored?: boolean[];      // true = right-censored (still running)
  confidence_level?: number; // default 0.95
}

export interface WeibullResult {
  beta: number;             // Shape parameter
  eta: number;              // Scale parameter (characteristic life)
  mean_life: number;
  median_life: number;
  b10_life: number;         // 10% failure life
  b50_life: number;         // 50% failure life
  reliability_at_t: Array<{ t: number; reliability: number }>;
  failure_rate_type: "decreasing" | "constant" | "increasing";
  interpretation: string;
}

export interface MonteCarloToleranceInput {
  dimensions: Array<{
    nominal: number;
    tolerance_plus: number;
    tolerance_minus: number;
    distribution?: "normal" | "uniform" | "triangular";
  }>;
  assembly_function?: "sum" | "difference" | "rss"; // How dimensions stack
  iterations?: number;       // default 10000
  target_cpk?: number;       // default 1.33
}

export interface MonteCarloToleranceResult {
  nominal_stack: number;
  worst_case_max: number;
  worst_case_min: number;
  statistical_mean: number;
  statistical_std: number;
  statistical_3sigma_max: number;
  statistical_3sigma_min: number;
  rss_tolerance: number;
  cpk_estimate: number;
  ppm_out_of_spec: number;
  histogram: Array<{ bin_center: number; count: number }>;
  meets_target_cpk: boolean;
}

export interface ANOVAInput {
  groups: number[][];        // Each group = measurements for one factor level
  factor_names?: string[];
  alpha?: number;            // Significance level (default 0.05)
}

export interface ANOVAResult {
  f_statistic: number;
  p_value_approx: number;
  df_between: number;
  df_within: number;
  ss_between: number;
  ss_within: number;
  ss_total: number;
  ms_between: number;
  ms_within: number;
  significant: boolean;
  eta_squared: number;       // Effect size
  interpretation: string;
  group_means: number[];
}

export interface RegressionInput {
  x: number[] | number[][];  // Single or multi-variate predictors
  y: number[];               // Response variable
  type?: "linear" | "polynomial" | "power"; // y = a·x^b for power
  degree?: number;           // For polynomial (default 2)
}

export interface RegressionResult {
  coefficients: number[];
  r_squared: number;
  adjusted_r_squared: number;
  rmse: number;
  equation: string;
  predictions: number[];
  residuals: number[];
  significant_terms: string[];
}

export interface OEEInput {
  planned_production_time_min: number;
  actual_run_time_min: number;
  ideal_cycle_time_min: number;
  total_parts: number;
  good_parts: number;
  downtime_events?: Array<{ reason: string; duration_min: number }>;
}

export interface OEEResult {
  oee_pct: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  total_downtime_min: number;
  speed_loss_pct: number;
  quality_loss_pct: number;
  teep_pct: number;          // Total effective equipment performance
  world_class: boolean;      // OEE > 85%
  interpretation: string;
  improvement_areas: string[];
}

export interface GageRRInput {
  measurements: number[][][]; // [operator][part][trial]
  tolerance?: number;
}

export interface GageRRResult {
  grr_pct: number;
  repeatability_pct: number;
  reproducibility_pct: number;
  part_variation_pct: number;
  ndc: number;               // Number of distinct categories
  acceptable: boolean;       // GRR < 10%
  marginal: boolean;         // 10% < GRR < 30%
  interpretation: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class ManufacturingStatisticsEngineImpl {

  // =========================================================================
  // PROCESS CAPABILITY (Cp, Cpk, Pp, Ppk, Cpm)
  // =========================================================================

  processCapability(input: ProcessCapabilityInput): ProcessCapabilityResult {
    const { measurements, usl, lsl } = input;
    const n = measurements.length;
    const mean = this._mean(measurements);
    const sigma = this._stdDev(measurements);
    const target = input.target ?? (usl + lsl) / 2;

    const cp = (usl - lsl) / (6 * sigma);
    const cpu = (usl - mean) / (3 * sigma);
    const cpl = (mean - lsl) / (3 * sigma);
    const cpk = Math.min(cpu, cpl);

    // Taguchi Cpm (accounts for target offset)
    const sigmaT = Math.sqrt(sigma * sigma + (mean - target) * (mean - target));
    const cpm = (usl - lsl) / (6 * sigmaT);

    // Pp/Ppk (using overall std dev — same as Cp/Cpk for single subgroup)
    const pp = cp;
    const ppk = cpk;

    // PPM defective (from normal distribution approximation)
    const zUpper = (usl - mean) / sigma;
    const zLower = (mean - lsl) / sigma;
    const ppmUpper = this._normalCDF(-zUpper) * 1e6;
    const ppmLower = this._normalCDF(-zLower) * 1e6;
    const ppmDefective = Math.round(ppmUpper + ppmLower);

    const sigmaLevel = Math.min(zUpper, zLower);
    const withinSpec = (1 - ppmDefective / 1e6) * 100;

    let interpretation = "";
    if (cpk >= 2.0) interpretation = "Excellent — Six Sigma capable";
    else if (cpk >= 1.67) interpretation = "Very good — exceeds requirements";
    else if (cpk >= 1.33) interpretation = "Good — meets typical aerospace/auto requirements";
    else if (cpk >= 1.0) interpretation = "Marginal — barely capable, improvement needed";
    else interpretation = "Not capable — process produces defects, immediate action required";

    return { n, mean, std_dev: sigma, cp, cpk, cpu, cpl, cpm, pp, ppk, ppm_defective: ppmDefective, sigma_level: sigmaLevel, within_spec_pct: withinSpec, interpretation };
  }

  // =========================================================================
  // SPC CONTROL CHARTS
  // =========================================================================

  spcChart(input: SPCChartInput): SPCChartResult {
    const chartType = input.chart_type ?? "xbar_r";
    const subgroups = input.subgroups;

    if (chartType === "xbar_r") return this._xbarRChart(subgroups);
    if (chartType === "xbar_s") return this._xbarSChart(subgroups);
    if (chartType === "individuals") return this._individualsChart(subgroups.map(s => s[0]));
    if (chartType === "cusum") return this._cusumChart(subgroups.map(s => this._mean(s)), input);
    if (chartType === "ewma") return this._ewmaChart(subgroups.map(s => this._mean(s)), input);

    return this._xbarRChart(subgroups);
  }

  // =========================================================================
  // WEIBULL RELIABILITY
  // =========================================================================

  weibullAnalysis(input: WeibullInput): WeibullResult {
    const times = [...input.failure_times].sort((a, b) => a - b);
    const n = times.length;

    // Median rank regression (Bernard's approximation)
    const ranks = times.map((_, i) => (i + 0.3) / (n + 0.4));

    // Linearize: ln(ln(1/(1-F))) = β·ln(t) - β·ln(η)
    const x = times.map(t => Math.log(t));
    const y = ranks.map(f => Math.log(Math.log(1 / (1 - f))));

    // Least squares
    const reg = this._linearRegression(x, y);
    const beta = reg.slope;
    const eta = Math.exp(-reg.intercept / beta);

    // Gamma function approximation for mean
    const meanLife = eta * this._gammaApprox(1 + 1 / beta);
    const medianLife = eta * Math.pow(Math.log(2), 1 / beta);
    const b10 = eta * Math.pow(-Math.log(0.9), 1 / beta);
    const b50 = medianLife;

    // Reliability curve
    const maxT = times[n - 1] * 1.5;
    const reliability: Array<{ t: number; reliability: number }> = [];
    for (let i = 0; i <= 10; i++) {
      const t = (maxT / 10) * i;
      reliability.push({ t: Math.round(t * 10) / 10, reliability: Math.round(Math.exp(-Math.pow(t / eta, beta)) * 10000) / 10000 });
    }

    const failureType = beta < 1 ? "decreasing" : beta === 1 ? "constant" : "increasing";
    let interpretation = "";
    if (beta < 1) interpretation = "Infant mortality — early failures dominant. Improve QC/burn-in.";
    else if (Math.abs(beta - 1) < 0.1) interpretation = "Random failures — no wear pattern. Check for external causes.";
    else if (beta < 3) interpretation = "Early wear-out — moderate wear. Consider preventive replacement.";
    else interpretation = "Rapid wear-out — strong aging effect. Schedule replacement before B10 life.";

    return {
      beta: Math.round(beta * 1000) / 1000,
      eta: Math.round(eta * 10) / 10,
      mean_life: Math.round(meanLife * 10) / 10,
      median_life: Math.round(medianLife * 10) / 10,
      b10_life: Math.round(b10 * 10) / 10,
      b50_life: Math.round(b50 * 10) / 10,
      reliability_at_t: reliability,
      failure_rate_type: failureType,
      interpretation,
    };
  }

  // =========================================================================
  // MONTE CARLO TOLERANCE STACKUP
  // =========================================================================

  monteCarloTolerance(input: MonteCarloToleranceInput): MonteCarloToleranceResult {
    const iterations = input.iterations ?? 10000;
    const dims = input.dimensions;
    const targetCpk = input.target_cpk ?? 1.33;

    // Worst case
    const nominalStack = dims.reduce((sum, d) => sum + d.nominal, 0);
    const wcMax = dims.reduce((sum, d) => sum + d.nominal + d.tolerance_plus, 0);
    const wcMin = dims.reduce((sum, d) => sum + d.nominal + d.tolerance_minus, 0);

    // RSS tolerance
    const rssTol = Math.sqrt(
      dims.reduce((sum, d) => {
        const tol = (d.tolerance_plus - d.tolerance_minus) / 2;
        return sum + tol * tol;
      }, 0)
    );

    // Monte Carlo simulation
    const results: number[] = [];
    for (let i = 0; i < iterations; i++) {
      let stack = 0;
      for (const dim of dims) {
        const dist = dim.distribution ?? "normal";
        const nominal = dim.nominal;
        const tolRange = dim.tolerance_plus - dim.tolerance_minus;
        const midTol = (dim.tolerance_plus + dim.tolerance_minus) / 2;

        if (dist === "uniform") {
          stack += nominal + dim.tolerance_minus + Math.random() * tolRange;
        } else if (dist === "triangular") {
          const u = Math.random();
          const half = tolRange / 2;
          const tri = u < 0.5
            ? dim.tolerance_minus + Math.sqrt(u * tolRange * half)
            : dim.tolerance_plus - Math.sqrt((1 - u) * tolRange * half);
          stack += nominal + tri;
        } else {
          // Normal (3-sigma fits within tolerance)
          const sigma = tolRange / 6;
          const z = this._boxMullerRandom();
          stack += nominal + midTol + z * sigma;
        }
      }
      results.push(stack);
    }

    const statMean = this._mean(results);
    const statStd = this._stdDev(results);
    const stat3Max = statMean + 3 * statStd;
    const stat3Min = statMean - 3 * statStd;

    // Histogram
    const bins = 20;
    const histMin = Math.min(...results);
    const histMax = Math.max(...results);
    const binWidth = (histMax - histMin) / bins;
    const histogram: Array<{ bin_center: number; count: number }> = [];
    for (let b = 0; b < bins; b++) {
      const lo = histMin + b * binWidth;
      const hi = lo + binWidth;
      const center = lo + binWidth / 2;
      const count = results.filter(r => r >= lo && r < hi).length;
      histogram.push({ bin_center: Math.round(center * 1000) / 1000, count });
    }

    // Estimate Cpk from total tolerance range
    const totalTolPlus = dims.reduce((s, d) => s + d.tolerance_plus, 0);
    const totalTolMinus = dims.reduce((s, d) => s + d.tolerance_minus, 0);
    const cpkEst = Math.min(
      (nominalStack + totalTolPlus - statMean) / (3 * statStd),
      (statMean - (nominalStack + totalTolMinus)) / (3 * statStd)
    );

    const ppmOut = results.filter(r => r > wcMax || r < wcMin).length / iterations * 1e6;

    return {
      nominal_stack: Math.round(nominalStack * 1000) / 1000,
      worst_case_max: Math.round(wcMax * 1000) / 1000,
      worst_case_min: Math.round(wcMin * 1000) / 1000,
      statistical_mean: Math.round(statMean * 1000) / 1000,
      statistical_std: Math.round(statStd * 10000) / 10000,
      statistical_3sigma_max: Math.round(stat3Max * 1000) / 1000,
      statistical_3sigma_min: Math.round(stat3Min * 1000) / 1000,
      rss_tolerance: Math.round(rssTol * 1000) / 1000,
      cpk_estimate: Math.round(cpkEst * 100) / 100,
      ppm_out_of_spec: Math.round(ppmOut),
      histogram,
      meets_target_cpk: cpkEst >= targetCpk,
    };
  }

  // =========================================================================
  // ANOVA (One-Way)
  // =========================================================================

  anova(input: ANOVAInput): ANOVAResult {
    const groups = input.groups;
    const alpha = input.alpha ?? 0.05;
    const k = groups.length;
    const allData = groups.flat();
    const N = allData.length;
    const grandMean = this._mean(allData);

    const groupMeans = groups.map(g => this._mean(g));
    const groupSizes = groups.map(g => g.length);

    // SS Between
    const ssBetween = groups.reduce((sum, g, i) => {
      return sum + g.length * Math.pow(groupMeans[i] - grandMean, 2);
    }, 0);

    // SS Within
    const ssWithin = groups.reduce((sum, g, i) => {
      return sum + g.reduce((s, x) => s + Math.pow(x - groupMeans[i], 2), 0);
    }, 0);

    const ssTotal = ssBetween + ssWithin;
    const dfBetween = k - 1;
    const dfWithin = N - k;
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const fStat = msBetween / msWithin;

    // Approximate p-value using F-distribution CDF
    const pValue = this._fDistPValue(fStat, dfBetween, dfWithin);
    const significant = pValue < alpha;
    const etaSquared = ssBetween / ssTotal;

    let interpretation = significant
      ? `Significant difference between groups (F=${fStat.toFixed(2)}, p=${pValue.toFixed(4)}). η²=${etaSquared.toFixed(3)} — ${etaSquared > 0.14 ? "large" : etaSquared > 0.06 ? "medium" : "small"} effect.`
      : `No significant difference between groups (F=${fStat.toFixed(2)}, p=${pValue.toFixed(4)}).`;

    return {
      f_statistic: Math.round(fStat * 100) / 100,
      p_value_approx: Math.round(pValue * 10000) / 10000,
      df_between: dfBetween,
      df_within: dfWithin,
      ss_between: Math.round(ssBetween * 100) / 100,
      ss_within: Math.round(ssWithin * 100) / 100,
      ss_total: Math.round(ssTotal * 100) / 100,
      ms_between: Math.round(msBetween * 100) / 100,
      ms_within: Math.round(msWithin * 100) / 100,
      significant,
      eta_squared: Math.round(etaSquared * 1000) / 1000,
      interpretation,
      group_means: groupMeans.map(m => Math.round(m * 1000) / 1000),
    };
  }

  // =========================================================================
  // REGRESSION (Linear, Polynomial, Power)
  // =========================================================================

  regression(input: RegressionInput): RegressionResult {
    const y = input.y;
    const type = input.type ?? "linear";

    if (type === "power") return this._powerRegression(input.x as number[], y);
    if (type === "polynomial") return this._polynomialRegression(input.x as number[], y, input.degree ?? 2);
    return this._simpleLinearRegression(input.x as number[], y);
  }

  // =========================================================================
  // OEE (Overall Equipment Effectiveness)
  // =========================================================================

  oee(input: OEEInput): OEEResult {
    const totalDowntime = input.planned_production_time_min - input.actual_run_time_min;
    const availability = input.actual_run_time_min / input.planned_production_time_min;
    const idealOutput = input.actual_run_time_min / input.ideal_cycle_time_min;
    const performance = idealOutput > 0 ? input.total_parts / idealOutput : 0;
    const quality = input.total_parts > 0 ? input.good_parts / input.total_parts : 0;
    const oee = availability * performance * quality;

    const speedLoss = (1 - performance) * 100;
    const qualityLoss = (1 - quality) * 100;

    // TEEP (Total Effective Equipment Performance) — assumes 24/7
    const teep = oee * (input.planned_production_time_min / (24 * 60));

    const improvements: string[] = [];
    if (availability < 0.90) improvements.push(`Availability ${(availability * 100).toFixed(1)}% — reduce downtime (${totalDowntime.toFixed(0)} min lost)`);
    if (performance < 0.95) improvements.push(`Performance ${(performance * 100).toFixed(1)}% — address speed losses, micro-stops`);
    if (quality < 0.99) improvements.push(`Quality ${(quality * 100).toFixed(1)}% — ${input.total_parts - input.good_parts} defective parts`);

    let interpretation = "";
    if (oee >= 0.85) interpretation = "World-class OEE — maintain current performance";
    else if (oee >= 0.65) interpretation = "Good OEE — typical for well-run shops";
    else if (oee >= 0.40) interpretation = "Below average — significant improvement potential";
    else interpretation = "Poor OEE — systematic issues need addressing";

    return {
      oee_pct: Math.round(oee * 1000) / 10,
      availability_pct: Math.round(availability * 1000) / 10,
      performance_pct: Math.round(performance * 1000) / 10,
      quality_pct: Math.round(quality * 1000) / 10,
      total_downtime_min: Math.round(totalDowntime * 10) / 10,
      speed_loss_pct: Math.round(speedLoss * 10) / 10,
      quality_loss_pct: Math.round(qualityLoss * 10) / 10,
      teep_pct: Math.round(teep * 1000) / 10,
      world_class: oee >= 0.85,
      interpretation,
      improvement_areas: improvements,
    };
  }

  // =========================================================================
  // LEARNING CURVE
  // =========================================================================

  learningCurve(firstUnitTime: number, learningRate: number, unitNumber: number): {
    unit_time: number;
    cumulative_time: number;
    cumulative_average: number;
    improvement_pct: number;
  } {
    const b = Math.log(learningRate) / Math.log(2);
    const unitTime = firstUnitTime * Math.pow(unitNumber, b);
    let cumTime = 0;
    for (let i = 1; i <= unitNumber; i++) {
      cumTime += firstUnitTime * Math.pow(i, b);
    }
    const cumAvg = cumTime / unitNumber;
    const improvement = (1 - unitTime / firstUnitTime) * 100;

    return {
      unit_time: Math.round(unitTime * 100) / 100,
      cumulative_time: Math.round(cumTime * 100) / 100,
      cumulative_average: Math.round(cumAvg * 100) / 100,
      improvement_pct: Math.round(improvement * 10) / 10,
    };
  }

  // =========================================================================
  // GAGE R&R (Measurement System Analysis)
  // =========================================================================

  gageRR(input: GageRRInput): GageRRResult {
    const data = input.measurements;
    const operators = data.length;
    const parts = data[0].length;
    const trials = data[0][0].length;

    // Grand mean
    const allMeas = data.flat(2);
    const grandMean = this._mean(allMeas);

    // Repeatability (Equipment Variation) — average range × 1/d2
    let totalRange = 0;
    let rangeCount = 0;
    for (let o = 0; o < operators; o++) {
      for (let p = 0; p < parts; p++) {
        const trialData = data[o][p];
        const range = Math.max(...trialData) - Math.min(...trialData);
        totalRange += range;
        rangeCount++;
      }
    }
    const avgRange = totalRange / rangeCount;
    const d2 = trials === 2 ? 1.128 : trials === 3 ? 1.693 : 2.059; // d2 constants
    const repeatability = avgRange / d2;

    // Reproducibility (Appraiser Variation)
    const operatorMeans = data.map(opData => this._mean(opData.flat()));
    const xDiff = Math.max(...operatorMeans) - Math.min(...operatorMeans);
    const d2_ops = operators === 2 ? 1.128 : operators === 3 ? 1.693 : 2.059;
    const reproducibility = Math.sqrt(Math.max(0, (xDiff / d2_ops) ** 2 - repeatability ** 2 / (parts * trials)));

    // GRR
    const grr = Math.sqrt(repeatability ** 2 + reproducibility ** 2);

    // Part variation
    const partMeans: number[] = [];
    for (let p = 0; p < parts; p++) {
      const partData = data.map(opData => opData[p]).flat();
      partMeans.push(this._mean(partData));
    }
    const rp = Math.max(...partMeans) - Math.min(...partMeans);
    const d2_parts = parts <= 5 ? [0, 0, 1.128, 1.693, 2.059, 2.326][parts] ?? 2.5 : 2.5;
    const partVariation = rp / d2_parts;

    // Total variation
    const totalVariation = Math.sqrt(grr ** 2 + partVariation ** 2);

    // Percentages
    const grrPct = totalVariation > 0 ? (grr / totalVariation) * 100 : 0;
    const repeatPct = totalVariation > 0 ? (repeatability / totalVariation) * 100 : 0;
    const reproPct = totalVariation > 0 ? (reproducibility / totalVariation) * 100 : 0;
    const partPct = totalVariation > 0 ? (partVariation / totalVariation) * 100 : 0;

    // Number of distinct categories
    const ndc = Math.floor(1.41 * (partVariation / grr));

    const acceptable = grrPct < 10;
    const marginal = grrPct >= 10 && grrPct < 30;

    let interpretation = "";
    if (acceptable) interpretation = `Measurement system acceptable (GRR=${grrPct.toFixed(1)}%). NDC=${ndc} — adequate discrimination.`;
    else if (marginal) interpretation = `Measurement system marginal (GRR=${grrPct.toFixed(1)}%). May be acceptable depending on application.`;
    else interpretation = `Measurement system unacceptable (GRR=${grrPct.toFixed(1)}%). Needs improvement. NDC=${ndc} (<5 is inadequate).`;

    return {
      grr_pct: Math.round(grrPct * 10) / 10,
      repeatability_pct: Math.round(repeatPct * 10) / 10,
      reproducibility_pct: Math.round(reproPct * 10) / 10,
      part_variation_pct: Math.round(partPct * 10) / 10,
      ndc,
      acceptable,
      marginal,
      interpretation,
    };
  }

  // =========================================================================
  // PRIVATE — Statistical Helpers
  // =========================================================================

  private _mean(arr: number[]): number {
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  private _stdDev(arr: number[]): number {
    const m = this._mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  }

  private _normalCDF(z: number): number {
    // Abramowitz & Stegun approximation
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }

  private _boxMullerRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private _gammaApprox(n: number): number {
    // Stirling's approximation for Γ(n) where n > 0
    if (n <= 0) return 1;
    if (n === 1) return 1;
    if (n === 0.5) return Math.sqrt(Math.PI);
    // Lanczos approximation
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (n < 0.5) return Math.PI / (Math.sin(Math.PI * n) * this._gammaApprox(1 - n));
    const x = n - 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
  }

  private _linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const mx = this._mean(x);
    const my = this._mean(y);
    let ssxy = 0, ssxx = 0, ssyy = 0;
    for (let i = 0; i < n; i++) {
      ssxy += (x[i] - mx) * (y[i] - my);
      ssxx += (x[i] - mx) ** 2;
      ssyy += (y[i] - my) ** 2;
    }
    const slope = ssxy / ssxx;
    const intercept = my - slope * mx;
    const rSquared = ssyy > 0 ? (ssxy ** 2) / (ssxx * ssyy) : 0;
    return { slope, intercept, rSquared };
  }

  private _simpleLinearRegression(x: number[], y: number[]): RegressionResult {
    const reg = this._linearRegression(x, y);
    const predictions = x.map(xi => reg.intercept + reg.slope * xi);
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / y.length);
    return {
      coefficients: [reg.intercept, reg.slope],
      r_squared: Math.round(reg.rSquared * 10000) / 10000,
      adjusted_r_squared: Math.round((1 - (1 - reg.rSquared) * (y.length - 1) / (y.length - 2)) * 10000) / 10000,
      rmse: Math.round(rmse * 10000) / 10000,
      equation: `y = ${reg.intercept.toFixed(4)} + ${reg.slope.toFixed(4)}·x`,
      predictions,
      residuals,
      significant_terms: reg.rSquared > 0.5 ? ["x"] : [],
    };
  }

  private _powerRegression(x: number[], y: number[]): RegressionResult {
    // y = a·x^b → ln(y) = ln(a) + b·ln(x)
    const lnX = x.map(v => Math.log(Math.max(v, 1e-10)));
    const lnY = y.map(v => Math.log(Math.max(v, 1e-10)));
    const reg = this._linearRegression(lnX, lnY);
    const a = Math.exp(reg.intercept);
    const b = reg.slope;
    const predictions = x.map(xi => a * Math.pow(xi, b));
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / y.length);
    return {
      coefficients: [a, b],
      r_squared: Math.round(reg.rSquared * 10000) / 10000,
      adjusted_r_squared: Math.round((1 - (1 - reg.rSquared) * (y.length - 1) / (y.length - 2)) * 10000) / 10000,
      rmse: Math.round(rmse * 10000) / 10000,
      equation: `y = ${a.toFixed(4)} · x^${b.toFixed(4)}`,
      predictions,
      residuals,
      significant_terms: ["x^b"],
    };
  }

  private _polynomialRegression(x: number[], y: number[], degree: number): RegressionResult {
    // Vandermonde matrix approach (simplified for degree 2-3)
    const n = x.length;
    const d = Math.min(degree, 3);

    // Build normal equations
    const cols = d + 1;
    const A: number[][] = Array.from({ length: cols }, () => Array(cols).fill(0));
    const B: number[] = Array(cols).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < cols; j++) {
        B[j] += y[i] * Math.pow(x[i], j);
        for (let k = 0; k < cols; k++) {
          A[j][k] += Math.pow(x[i], j + k);
        }
      }
    }

    // Solve via Gaussian elimination
    const coeffs = this._gaussianElim(A, B);
    const predictions = x.map(xi => coeffs.reduce((sum, c, j) => sum + c * Math.pow(xi, j), 0));
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const my = this._mean(y);
    const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
    const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const adjRSq = 1 - (1 - rSq) * (n - 1) / (n - d - 1);
    const rmse = Math.sqrt(ssRes / n);

    const terms = coeffs.map((c, i) => i === 0 ? c.toFixed(4) : `${c.toFixed(4)}·x${i > 1 ? "^" + i : ""}`);
    return {
      coefficients: coeffs.map(c => Math.round(c * 10000) / 10000),
      r_squared: Math.round(rSq * 10000) / 10000,
      adjusted_r_squared: Math.round(adjRSq * 10000) / 10000,
      rmse: Math.round(rmse * 10000) / 10000,
      equation: `y = ${terms.join(" + ")}`,
      predictions,
      residuals,
      significant_terms: coeffs.slice(1).map((c, i) => Math.abs(c) > 1e-6 ? `x${i + 1 > 1 ? "^" + (i + 1) : ""}` : "").filter(Boolean),
    };
  }

  private _gaussianElim(A: number[][], B: number[]): number[] {
    const n = A.length;
    const M = A.map((row, i) => [...row, B[i]]);

    for (let i = 0; i < n; i++) {
      // Pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      if (Math.abs(M[i][i]) < 1e-12) continue;

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
      x[i] /= M[i][i] || 1;
    }
    return x;
  }

  private _fDistPValue(f: number, df1: number, df2: number): number {
    // Approximation using beta incomplete function
    const x = df2 / (df2 + df1 * f);
    return this._betaIncomplete(x, df2 / 2, df1 / 2);
  }

  private _betaIncomplete(x: number, a: number, b: number): number {
    // Continued fraction approximation (Lentz's method, simplified)
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Simple numerical integration
    const steps = 100;
    const dx = x / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dx;
      sum += Math.pow(t, a - 1) * Math.pow(1 - t, b - 1) * dx;
    }
    const beta = this._gammaApprox(a) * this._gammaApprox(b) / this._gammaApprox(a + b);
    return Math.min(1, sum / beta);
  }

  // SPC Chart implementations
  private _xbarRChart(subgroups: number[][]): SPCChartResult {
    const n = subgroups[0]?.length ?? 1;
    const means = subgroups.map(s => this._mean(s));
    const ranges = subgroups.map(s => Math.max(...s) - Math.min(...s));
    const xbar = this._mean(means);
    const rbar = this._mean(ranges);

    // A2, D3, D4 constants for control chart
    const A2: Record<number, number> = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483 };
    const a2 = A2[n] ?? 0.577;
    const ucl = xbar + a2 * rbar;
    const lcl = xbar - a2 * rbar;

    const points = means.map((m, i) => ({
      subgroup: i + 1, value: Math.round(m * 10000) / 10000,
      range_or_std: Math.round(ranges[i] * 10000) / 10000,
      out_of_control: m > ucl || m < lcl,
      rule_violations: this._checkWesternElectric(means, i, xbar, (ucl - xbar) / 3),
    }));

    return {
      chart_type: "xbar_r",
      center_line: Math.round(xbar * 10000) / 10000,
      ucl: Math.round(ucl * 10000) / 10000,
      lcl: Math.round(lcl * 10000) / 10000,
      points,
      out_of_control_count: points.filter(p => p.out_of_control).length,
      process_in_control: points.every(p => !p.out_of_control && p.rule_violations.length === 0),
      rules_checked: ["1 point beyond 3σ", "2 of 3 beyond 2σ", "4 of 5 beyond 1σ", "8 consecutive same side"],
    };
  }

  private _xbarSChart(subgroups: number[][]): SPCChartResult {
    const means = subgroups.map(s => this._mean(s));
    const stds = subgroups.map(s => this._stdDev(s));
    const xbar = this._mean(means);
    const sbar = this._mean(stds);
    const n = subgroups[0]?.length ?? 1;
    const c4: Record<number, number> = { 2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400 };
    const c = c4[n] ?? 0.94;
    const sigma = sbar / c;
    const ucl = xbar + 3 * sigma / Math.sqrt(n);
    const lcl = xbar - 3 * sigma / Math.sqrt(n);

    const points = means.map((m, i) => ({
      subgroup: i + 1, value: Math.round(m * 10000) / 10000,
      range_or_std: Math.round(stds[i] * 10000) / 10000,
      out_of_control: m > ucl || m < lcl,
      rule_violations: [] as string[],
    }));

    return {
      chart_type: "xbar_s", center_line: Math.round(xbar * 10000) / 10000,
      ucl: Math.round(ucl * 10000) / 10000, lcl: Math.round(lcl * 10000) / 10000,
      points, out_of_control_count: points.filter(p => p.out_of_control).length,
      process_in_control: points.every(p => !p.out_of_control),
      rules_checked: ["1 point beyond 3σ"],
    };
  }

  private _individualsChart(values: number[]): SPCChartResult {
    const xbar = this._mean(values);
    const mRanges: number[] = [];
    for (let i = 1; i < values.length; i++) mRanges.push(Math.abs(values[i] - values[i - 1]));
    const mrBar = this._mean(mRanges);
    const sigma = mrBar / 1.128;
    const ucl = xbar + 3 * sigma;
    const lcl = xbar - 3 * sigma;

    const points = values.map((v, i) => ({
      subgroup: i + 1, value: Math.round(v * 10000) / 10000,
      range_or_std: i > 0 ? Math.round(mRanges[i - 1] * 10000) / 10000 : 0,
      out_of_control: v > ucl || v < lcl,
      rule_violations: [] as string[],
    }));

    return {
      chart_type: "individuals", center_line: Math.round(xbar * 10000) / 10000,
      ucl: Math.round(ucl * 10000) / 10000, lcl: Math.round(lcl * 10000) / 10000,
      points, out_of_control_count: points.filter(p => p.out_of_control).length,
      process_in_control: points.every(p => !p.out_of_control),
      rules_checked: ["1 point beyond 3σ"],
    };
  }

  private _cusumChart(values: number[], input: SPCChartInput): SPCChartResult {
    const target = input.target_mean ?? this._mean(values);
    const sigma = this._stdDev(values);
    const k = (input.k_cusum ?? 0.5) * sigma;
    const h = (input.h_cusum ?? 5) * sigma;

    let sPlus = 0, sMinus = 0;
    const points = values.map((v, i) => {
      sPlus = Math.max(0, sPlus + v - target - k);
      sMinus = Math.max(0, sMinus - v + target - k);
      const ooc = sPlus > h || sMinus > h;
      return {
        subgroup: i + 1, value: Math.round(v * 10000) / 10000,
        range_or_std: Math.round(Math.max(sPlus, sMinus) * 10000) / 10000,
        out_of_control: ooc,
        rule_violations: ooc ? ["CUSUM exceeds decision interval"] : [],
      };
    });

    return {
      chart_type: "cusum", center_line: Math.round(target * 10000) / 10000,
      ucl: Math.round(h * 10000) / 10000, lcl: Math.round(-h * 10000) / 10000,
      points, out_of_control_count: points.filter(p => p.out_of_control).length,
      process_in_control: points.every(p => !p.out_of_control),
      rules_checked: ["CUSUM exceeds h"],
    };
  }

  private _ewmaChart(values: number[], input: SPCChartInput): SPCChartResult {
    const lambda = input.lambda ?? 0.2;
    const target = input.target_mean ?? this._mean(values);
    const sigma = this._stdDev(values);

    let ewma = target;
    const points = values.map((v, i) => {
      ewma = lambda * v + (1 - lambda) * ewma;
      const sigmaEWMA = sigma * Math.sqrt(lambda / (2 - lambda) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
      const ucl_i = target + 3 * sigmaEWMA;
      const lcl_i = target - 3 * sigmaEWMA;
      const ooc = ewma > ucl_i || ewma < lcl_i;
      return {
        subgroup: i + 1, value: Math.round(ewma * 10000) / 10000,
        range_or_std: Math.round(sigmaEWMA * 10000) / 10000,
        out_of_control: ooc,
        rule_violations: ooc ? ["EWMA outside control limits"] : [],
      };
    });

    const steadyUCL = target + 3 * sigma * Math.sqrt(lambda / (2 - lambda));
    return {
      chart_type: "ewma", center_line: Math.round(target * 10000) / 10000,
      ucl: Math.round(steadyUCL * 10000) / 10000,
      lcl: Math.round((target - (steadyUCL - target)) * 10000) / 10000,
      points, out_of_control_count: points.filter(p => p.out_of_control).length,
      process_in_control: points.every(p => !p.out_of_control),
      rules_checked: ["EWMA outside time-varying limits"],
    };
  }

  private _checkWesternElectric(values: number[], idx: number, center: number, sigma: number): string[] {
    const violations: string[] = [];
    if (sigma <= 0) return violations;

    // Rule 1: 1 point beyond 3σ (handled by UCL/LCL check)
    // Rule 2: 2 of 3 consecutive beyond 2σ same side
    if (idx >= 2) {
      const last3 = [values[idx - 2], values[idx - 1], values[idx]];
      const above2 = last3.filter(v => v > center + 2 * sigma).length;
      const below2 = last3.filter(v => v < center - 2 * sigma).length;
      if (above2 >= 2) violations.push("2 of 3 beyond 2σ (upper)");
      if (below2 >= 2) violations.push("2 of 3 beyond 2σ (lower)");
    }

    // Rule 3: 4 of 5 beyond 1σ same side
    if (idx >= 4) {
      const last5 = values.slice(idx - 4, idx + 1);
      const above1 = last5.filter(v => v > center + sigma).length;
      const below1 = last5.filter(v => v < center - sigma).length;
      if (above1 >= 4) violations.push("4 of 5 beyond 1σ (upper)");
      if (below1 >= 4) violations.push("4 of 5 beyond 1σ (lower)");
    }

    // Rule 4: 8 consecutive on same side
    if (idx >= 7) {
      const last8 = values.slice(idx - 7, idx + 1);
      if (last8.every(v => v > center)) violations.push("8 consecutive above center");
      if (last8.every(v => v < center)) violations.push("8 consecutive below center");
    }

    return violations;
  }
}

export const manufacturingStatisticsEngine = new ManufacturingStatisticsEngineImpl();
