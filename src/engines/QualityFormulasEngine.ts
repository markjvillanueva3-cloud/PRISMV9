/**
 * QualityFormulasEngine — Quality engineering formulas
 *
 * Closes 12 QUALITY orphan formulas with rigorous implementations:
 *
 * Methods:
 *   - gageRR: Gage R&R study, %GRR, number of distinct categories ndc
 *   - samplingPlan: AQL/LTPD-based OC curve, sample size, accept number, AOQ, ATI
 *   - processCapabilityAdvanced: Cpm (Taguchi), non-normal Cpk (Clements), CI for Cpk
 *   - measurementUncertainty: ISO GUM expanded uncertainty, coverage factor, DOF
 *   - conformanceDecision: ISO 14253-1 conformance zone, guard band, acceptance probability
 *
 * References:
 *   AIAG (2010). "Measurement Systems Analysis", 4th ed.
 *   ISO/IEC Guide 98-3:2008 (GUM). "Uncertainty of measurement".
 *   ISO 14253-1:2017. "Decision rules for proving conformance or nonconformance".
 *   Montgomery, D. (2019). "Statistical Quality Control", 8th ed.
 *
 * Actions: calc_gage_rr, calc_sampling_plan, calc_process_capability_advanced,
 *          calc_measurement_uncertainty, calc_conformance_decision
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface GageRRInput {
  /** Measurements: [operator][part][replicate] */
  measurements: number[][][];
  /** Tolerance (USL - LSL) for %GRR calculation */
  tolerance?: number;
  /** Study variation multiplier (default 5.15 for 99%) */
  study_var_multiplier?: number;
}

export interface GageRRResult {
  /** Repeatability (equipment variation) σ */
  repeatability: number;
  /** Reproducibility (operator variation) σ */
  reproducibility: number;
  /** Total gage R&R σ */
  gage_rr: number;
  /** Part-to-part variation σ */
  part_variation: number;
  /** Total variation σ */
  total_variation: number;
  /** %GRR (of total variation) */
  pct_grr_total: number;
  /** %GRR (of tolerance) if tolerance provided */
  pct_grr_tolerance: number | null;
  /** Number of distinct categories ndc = 1.41 * (σ_part / σ_gage) */
  ndc: number;
  /** Assessment: "acceptable" (<10%), "marginal" (10-30%), "unacceptable" (>30%) */
  assessment: string;
}

export interface SamplingPlanInput {
  /** Acceptable quality level (fraction defective) */
  aql: number;
  /** Lot tolerance percent defective */
  ltpd: number;
  /** Producer's risk α (default 0.05) */
  alpha?: number;
  /** Consumer's risk β (default 0.10) */
  beta?: number;
  /** Lot size N */
  lot_size: number;
}

export interface SamplingPlanResult {
  /** Sample size n */
  sample_size: number;
  /** Acceptance number c */
  accept_number: number;
  /** OC curve points [{p, Pa}] */
  oc_curve: Array<{ defect_rate: number; acceptance_prob: number }>;
  /** Average outgoing quality at AQL */
  aoq_at_aql: number;
  /** Average total inspection at AQL */
  ati_at_aql: number;
  /** Average outgoing quality limit */
  aoql: number;
}

export interface ProcessCapabilityAdvancedInput {
  /** Data values */
  data: number[];
  /** Upper specification limit */
  usl: number;
  /** Lower specification limit */
  lsl: number;
  /** Target value (for Cpm, default midpoint of spec) */
  target?: number;
  /** Confidence level for CI (default 0.95) */
  confidence?: number;
  /** Assume non-normal distribution? (default false) */
  non_normal?: boolean;
}

export interface ProcessCapabilityAdvancedResult {
  /** Standard Cp */
  cp: number;
  /** Standard Cpk */
  cpk: number;
  /** Taguchi Cpm */
  cpm: number;
  /** Cpk lower confidence bound */
  cpk_lower_ci: number;
  /** Cpk upper confidence bound */
  cpk_upper_ci: number;
  /** Pp (long-term) */
  pp: number;
  /** Ppk (long-term) */
  ppk: number;
  /** Expected defect rate (PPM) */
  expected_ppm: number;
  /** Process sigma level */
  sigma_level: number;
  /** Method used for non-normal */
  method: string;
}

export interface MeasurementUncertaintyInput {
  /** Type A components: repeated measurement values */
  type_a_values?: number[];
  /** Type B components: [{value, distribution, half_width}] */
  type_b_components?: Array<{
    /** Uncertainty value or half-width */
    value: number;
    /** Distribution type: "rectangular" | "triangular" | "normal" | "u_shaped" */
    distribution: string;
    /** Degrees of freedom (default Infinity for Type B) */
    dof?: number;
  }>;
  /** Coverage probability (default 0.95) */
  coverage_probability?: number;
  /** Sensitivity coefficients for each component */
  sensitivity_coeffs?: number[];
}

export interface MeasurementUncertaintyResult {
  /** Combined standard uncertainty uc */
  combined_uncertainty: number;
  /** Expanded uncertainty U = k * uc */
  expanded_uncertainty: number;
  /** Coverage factor k */
  coverage_factor: number;
  /** Effective degrees of freedom (Welch-Satterthwaite) */
  effective_dof: number;
  /** Individual component uncertainties */
  components: Array<{
    type: "A" | "B";
    standard_uncertainty: number;
    dof: number;
    contribution_pct: number;
  }>;
}

export interface ConformanceDecisionInput {
  /** Measured value */
  measured_value: number;
  /** Expanded measurement uncertainty U */
  uncertainty: number;
  /** Upper specification limit */
  usl: number;
  /** Lower specification limit */
  lsl: number;
  /** Guard band multiplier (default 1.0 = full uncertainty) */
  guard_band_factor?: number;
  /** Decision rule: "simple" | "guard_banded" | "shared_risk" */
  decision_rule?: string;
}

export interface ConformanceDecisionResult {
  /** Decision: "conforming" | "non_conforming" | "indeterminate" */
  decision: string;
  /** Acceptance zone [lower, upper] */
  acceptance_zone: [number, number];
  /** Guard band width */
  guard_band: number;
  /** Distance from nearest spec limit */
  margin: number;
  /** Estimated probability of conformance */
  conformance_probability: number;
  /** Risk of false acceptance */
  false_accept_risk: number;
  /** ISO 14253-1 zone: "conformance" | "non_conformance" | "uncertainty" */
  iso_zone: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * z);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

/** Inverse normal CDF approximation (Beasley-Springer-Moro) */
function normalInvCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (Math.abs(p - 0.5) < 1e-12) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Binomial PMF */
function binomialPMF(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  let logCoeff = 0;
  for (let i = 0; i < k; i++) {
    logCoeff += Math.log(n - i) - Math.log(i + 1);
  }
  return Math.exp(logCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** Binomial CDF */
function binomialCDF(n: number, c: number, p: number): number {
  let sum = 0;
  for (let k = 0; k <= c; k++) {
    sum += binomialPMF(n, k, p);
  }
  return sum;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class QualityFormulasEngine {
  /**
   * Gage R&R study (ANOVA method).
   * %GRR = σ_gage / σ_total * 100. ndc = 1.41 * (σ_part / σ_gage).
   */
  gageRR(p: GageRRInput): GageRRResult {
    const ops = p.measurements.length;
    const parts = p.measurements[0].length;
    const reps = p.measurements[0][0].length;
    const k = p.study_var_multiplier ?? 5.15;

    // Grand mean
    let grandSum = 0, count = 0;
    for (let o = 0; o < ops; o++)
      for (let pr = 0; pr < parts; pr++)
        for (let r = 0; r < reps; r++) {
          grandSum += p.measurements[o][pr][r];
          count++;
        }
    const grandMean = grandSum / count;

    // Operator means
    const opMeans = new Array(ops).fill(0);
    for (let o = 0; o < ops; o++) {
      let s = 0, c = 0;
      for (let pr = 0; pr < parts; pr++)
        for (let r = 0; r < reps; r++) { s += p.measurements[o][pr][r]; c++; }
      opMeans[o] = s / c;
    }

    // Part means
    const partMeans = new Array(parts).fill(0);
    for (let pr = 0; pr < parts; pr++) {
      let s = 0, c = 0;
      for (let o = 0; o < ops; o++)
        for (let r = 0; r < reps; r++) { s += p.measurements[o][pr][r]; c++; }
      partMeans[pr] = s / c;
    }

    // Cell means
    const cellMeans: number[][] = Array.from({ length: ops }, () => new Array(parts).fill(0));
    for (let o = 0; o < ops; o++)
      for (let pr = 0; pr < parts; pr++) {
        cellMeans[o][pr] = p.measurements[o][pr].reduce((s, v) => s + v, 0) / reps;
      }

    // ANOVA components
    // SS_operator
    let ssOp = 0;
    for (let o = 0; o < ops; o++) ssOp += parts * reps * (opMeans[o] - grandMean) ** 2;
    // SS_part
    let ssPart = 0;
    for (let pr = 0; pr < parts; pr++) ssPart += ops * reps * (partMeans[pr] - grandMean) ** 2;
    // SS_interaction
    let ssInt = 0;
    for (let o = 0; o < ops; o++)
      for (let pr = 0; pr < parts; pr++)
        ssInt += reps * (cellMeans[o][pr] - opMeans[o] - partMeans[pr] + grandMean) ** 2;
    // SS_equipment (within cells)
    let ssEquip = 0;
    for (let o = 0; o < ops; o++)
      for (let pr = 0; pr < parts; pr++)
        for (let r = 0; r < reps; r++)
          ssEquip += (p.measurements[o][pr][r] - cellMeans[o][pr]) ** 2;

    // Mean squares
    const dfOp = ops - 1;
    const dfPart = parts - 1;
    const dfInt = dfOp * dfPart;
    const dfEquip = ops * parts * (reps - 1);

    const msEquip = dfEquip > 0 ? ssEquip / dfEquip : 0;
    const msInt = dfInt > 0 ? ssInt / dfInt : 0;
    const msOp = dfOp > 0 ? ssOp / dfOp : 0;
    const msPart = dfPart > 0 ? ssPart / dfPart : 0;

    // Variance components
    const varEquip = msEquip;
    const varInt = Math.max(0, (msInt - msEquip) / reps);
    const varOp = Math.max(0, (msOp - msInt) / (parts * reps));
    const varPart = Math.max(0, (msPart - msInt) / (ops * reps));

    const repeatability = Math.sqrt(varEquip);
    const reproducibility = Math.sqrt(varOp + varInt);
    const gageRR = Math.sqrt(varEquip + varOp + varInt);
    const partVar = Math.sqrt(varPart);
    const totalVar = Math.sqrt(varEquip + varOp + varInt + varPart);

    const pctGRRTotal = totalVar > 0 ? (gageRR / totalVar) * 100 : 0;
    const pctGRRTol = p.tolerance != null && p.tolerance > 0
      ? (gageRR * k / p.tolerance) * 100
      : null;
    const ndc = gageRR > 0 ? Math.floor(1.41 * (partVar / gageRR)) : 0;

    let assessment: string;
    if (pctGRRTotal < 10) assessment = "acceptable";
    else if (pctGRRTotal < 30) assessment = "marginal";
    else assessment = "unacceptable";

    return {
      repeatability,
      reproducibility,
      gage_rr: gageRR,
      part_variation: partVar,
      total_variation: totalVar,
      pct_grr_total: pctGRRTotal,
      pct_grr_tolerance: pctGRRTol,
      ndc,
      assessment,
    };
  }

  /**
   * Acceptance sampling plan — find n and c for given AQL/LTPD risks.
   */
  samplingPlan(p: SamplingPlanInput): SamplingPlanResult {
    const alpha = p.alpha ?? 0.05;
    const beta = p.beta ?? 0.10;
    const N = p.lot_size;

    // Search for smallest n,c satisfying both risks
    let bestN = N, bestC = 0;
    let found = false;

    for (let c = 0; c <= 20 && !found; c++) {
      for (let n = c + 1; n <= Math.min(N, 500); n++) {
        const paAql = binomialCDF(n, c, p.aql);
        const paLtpd = binomialCDF(n, c, p.ltpd);
        if (paAql >= 1 - alpha && paLtpd <= beta) {
          bestN = n;
          bestC = c;
          found = true;
          break;
        }
      }
    }

    // OC curve
    const ocCurve: Array<{ defect_rate: number; acceptance_prob: number }> = [];
    for (let i = 0; i <= 20; i++) {
      const pDef = i * 0.01;
      ocCurve.push({
        defect_rate: pDef,
        acceptance_prob: binomialCDF(bestN, bestC, pDef),
      });
    }

    // AOQ at AQL: AOQ = p * Pa * (N-n) / N
    const paAtAql = binomialCDF(bestN, bestC, p.aql);
    const aoqAtAql = p.aql * paAtAql * (N - bestN) / N;

    // ATI at AQL: ATI = n * Pa + N * (1-Pa)
    const atiAtAql = bestN * paAtAql + N * (1 - paAtAql);

    // AOQL: max of AOQ curve
    let aoql = 0;
    for (let i = 1; i <= 100; i++) {
      const pDef = i * 0.005;
      const pa = binomialCDF(bestN, bestC, pDef);
      const aoq = pDef * pa * (N - bestN) / N;
      if (aoq > aoql) aoql = aoq;
    }

    return {
      sample_size: bestN,
      accept_number: bestC,
      oc_curve: ocCurve,
      aoq_at_aql: aoqAtAql,
      ati_at_aql: atiAtAql,
      aoql,
    };
  }

  /**
   * Advanced process capability — Cpm, non-normal Cpk, confidence intervals.
   */
  processCapabilityAdvanced(p: ProcessCapabilityAdvancedInput): ProcessCapabilityAdvancedResult {
    const n = p.data.length;
    if (n < 2) throw new Error("Need at least 2 data points");

    const mean = p.data.reduce((s, v) => s + v, 0) / n;
    const variance = p.data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const sigma = Math.sqrt(variance);
    const target = p.target ?? (p.usl + p.lsl) / 2;
    const confLevel = p.confidence ?? 0.95;

    const specRange = p.usl - p.lsl;

    // Standard indices
    const cp = specRange / (6 * sigma);
    const cpuNum = p.usl - mean;
    const cplNum = mean - p.lsl;
    const cpk = Math.min(cpuNum, cplNum) / (3 * sigma);

    // Cpm (Taguchi) — penalizes deviation from target
    const msdTarget = p.data.reduce((s, v) => s + (v - target) ** 2, 0) / n;
    const sigmaP = Math.sqrt(msdTarget);
    const cpm = specRange / (6 * sigmaP);

    // Non-normal Cpk via Clements method (percentile-based)
    let method = "normal";
    let ppk = cpk;
    let pp = cp;
    if (p.non_normal) {
      method = "clements_percentile";
      const sorted = [...p.data].sort((a, b) => a - b);
      const p0135 = sorted[Math.max(0, Math.floor(0.00135 * n))];
      const p50 = sorted[Math.floor(0.5 * n)];
      const p9865 = sorted[Math.min(n - 1, Math.floor(0.99865 * n))];
      const upperRange = p9865 - p50;
      const lowerRange = p50 - p0135;
      const totalRange = p9865 - p0135;
      pp = totalRange > 0 ? specRange / totalRange : cp;
      const cpkUpper = upperRange > 0 ? (p.usl - p50) / upperRange : cpuNum / (3 * sigma);
      const cpkLower = lowerRange > 0 ? (p50 - p.lsl) / lowerRange : cplNum / (3 * sigma);
      ppk = Math.min(cpkUpper, cpkLower);
    } else {
      pp = cp;
      ppk = cpk;
    }

    // Confidence interval for Cpk (Chou et al. 1990 approximation)
    const z = normalInvCDF(0.5 + confLevel / 2);
    const cpkVar = 1 / (9 * n) + cpk ** 2 / (2 * (n - 1));
    const cpkSE = Math.sqrt(cpkVar);
    const cpkLowerCI = cpk - z * cpkSE;
    const cpkUpperCI = cpk + z * cpkSE;

    // Expected PPM
    const zUpper = (p.usl - mean) / sigma;
    const zLower = (mean - p.lsl) / sigma;
    const ppmUpper = (1 - normalCDF(zUpper)) * 1e6;
    const ppmLower = (1 - normalCDF(zLower)) * 1e6;
    const expectedPPM = ppmUpper + ppmLower;

    // Sigma level
    const sigmaLevel = normalInvCDF(1 - expectedPPM / 1e6) + 1.5;

    return {
      cp,
      cpk,
      cpm,
      cpk_lower_ci: cpkLowerCI,
      cpk_upper_ci: cpkUpperCI,
      pp,
      ppk,
      expected_ppm: expectedPPM,
      sigma_level: sigmaLevel,
      method,
    };
  }

  /**
   * ISO GUM measurement uncertainty — Type A + Type B, Welch-Satterthwaite.
   */
  measurementUncertainty(p: MeasurementUncertaintyInput): MeasurementUncertaintyResult {
    const components: Array<{ type: "A" | "B"; standard_uncertainty: number; dof: number; contribution_pct: number }> = [];
    let totalVar = 0;

    // Type A: standard uncertainty from repeated measurements
    if (p.type_a_values && p.type_a_values.length >= 2) {
      const vals = p.type_a_values;
      const n = vals.length;
      const mean = vals.reduce((s, v) => s + v, 0) / n;
      const s = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
      const uA = s / Math.sqrt(n);
      const ci = p.sensitivity_coeffs?.[0] ?? 1;
      const contrib = (ci * uA) ** 2;
      totalVar += contrib;
      components.push({ type: "A", standard_uncertainty: uA, dof: n - 1, contribution_pct: 0 });
    }

    // Type B components
    if (p.type_b_components) {
      p.type_b_components.forEach((comp, idx) => {
        let uB: number;
        const sensIdx = (p.type_a_values?.length ? 1 : 0) + idx;
        const ci = p.sensitivity_coeffs?.[sensIdx] ?? 1;

        switch (comp.distribution) {
          case "rectangular":
            uB = comp.value / Math.sqrt(3);
            break;
          case "triangular":
            uB = comp.value / Math.sqrt(6);
            break;
          case "u_shaped":
            uB = comp.value / Math.sqrt(2);
            break;
          case "normal":
          default:
            uB = comp.value; // already standard uncertainty
            break;
        }

        const contrib = (ci * uB) ** 2;
        totalVar += contrib;
        const dof = comp.dof ?? 50; // Type B default: large DOF
        components.push({ type: "B", standard_uncertainty: uB, dof, contribution_pct: 0 });
      });
    }

    const uc = Math.sqrt(totalVar);

    // Update contribution percentages
    for (const comp of components) {
      const sensIdx = components.indexOf(comp);
      const ci = p.sensitivity_coeffs?.[sensIdx] ?? 1;
      comp.contribution_pct = totalVar > 0 ? ((ci * comp.standard_uncertainty) ** 2 / totalVar) * 100 : 0;
    }

    // Welch-Satterthwaite effective DOF
    let denom = 0;
    for (const comp of components) {
      const sensIdx = components.indexOf(comp);
      const ci = p.sensitivity_coeffs?.[sensIdx] ?? 1;
      const u4 = (ci * comp.standard_uncertainty) ** 4;
      if (comp.dof > 0) denom += u4 / comp.dof;
    }
    const vEff = denom > 0 ? totalVar ** 2 / denom : Infinity;

    // Coverage factor from t-distribution (approximate for large DOF)
    const covProb = p.coverage_probability ?? 0.95;
    let k: number;
    if (vEff > 100) {
      k = normalInvCDF(0.5 + covProb / 2);
    } else {
      // Simple t-distribution approximation for finite DOF
      const z = normalInvCDF(0.5 + covProb / 2);
      k = z + (z ** 3 + z) / (4 * Math.max(vEff, 1)) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * Math.max(vEff, 1) ** 2);
    }

    return {
      combined_uncertainty: uc,
      expanded_uncertainty: k * uc,
      coverage_factor: k,
      effective_dof: Math.min(vEff, 1e6),
      components,
    };
  }

  /**
   * ISO 14253-1 conformance decision with guard bands.
   */
  conformanceDecision(p: ConformanceDecisionInput): ConformanceDecisionResult {
    const U = p.uncertainty;
    const gbFactor = p.guard_band_factor ?? 1.0;
    const rule = p.decision_rule ?? "guard_banded";
    const measured = p.measured_value;

    let guardBand: number;
    let accLower: number;
    let accUpper: number;

    if (rule === "simple") {
      guardBand = 0;
      accLower = p.lsl;
      accUpper = p.usl;
    } else if (rule === "shared_risk") {
      guardBand = 0;
      accLower = p.lsl;
      accUpper = p.usl;
    } else {
      // guard_banded (ISO 14253-1 default)
      guardBand = gbFactor * U;
      accLower = p.lsl + guardBand;
      accUpper = p.usl - guardBand;
    }

    let decision: string;
    let isoZone: string;
    if (measured >= accLower && measured <= accUpper) {
      decision = "conforming";
      isoZone = "conformance";
    } else if (measured < p.lsl - U || measured > p.usl + U) {
      decision = "non_conforming";
      isoZone = "non_conformance";
    } else {
      decision = rule === "shared_risk" ? (measured >= p.lsl && measured <= p.usl ? "conforming" : "non_conforming") : "indeterminate";
      isoZone = "uncertainty";
    }

    const margin = Math.min(measured - p.lsl, p.usl - measured);

    // Conformance probability: P(LSL < true_value < USL | measured)
    const pConform = normalCDF((p.usl - measured) / U) - normalCDF((p.lsl - measured) / U);

    // False acceptance risk
    const falseAcceptRisk = rule === "guard_banded"
      ? 1 - pConform
      : (decision === "conforming" ? 1 - pConform : 0);

    return {
      decision,
      acceptance_zone: [accLower, accUpper],
      guard_band: guardBand,
      margin,
      conformance_probability: pConform,
      false_accept_risk: falseAcceptRisk,
      iso_zone: isoZone,
    };
  }

  /** Dispatcher entry */
  calculate(params: { action: string; params: Record<string, unknown> }): unknown {
    switch (params.action) {
      case "calc_gage_rr":
        return this.gageRR(params.params as unknown as GageRRInput);
      case "calc_sampling_plan":
        return this.samplingPlan(params.params as unknown as SamplingPlanInput);
      case "calc_process_capability_advanced":
        return this.processCapabilityAdvanced(params.params as unknown as ProcessCapabilityAdvancedInput);
      case "calc_measurement_uncertainty":
        return this.measurementUncertainty(params.params as unknown as MeasurementUncertaintyInput);
      case "calc_conformance_decision":
        return this.conformanceDecision(params.params as unknown as ConformanceDecisionInput);
      default:
        throw new Error(`Unknown quality action: ${params.action}`);
    }
  }
}

export const qualityFormulasEngine = new QualityFormulasEngine();
