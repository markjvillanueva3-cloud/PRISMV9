/**
 * SPCProcessCapabilityEngine — Statistical Process Control for machining.
 *
 * Computes Cp, Cpk, Pp, Ppk from measurement data; predicts reject rates;
 * recommends process adjustments based on statistical analysis.
 *
 * Uses: Normal distribution, capability indices, control chart limits,
 * Nelson rules for out-of-control detection.
 * ISO 22514-1 compliant measurement uncertainty propagation via Cholesky-backed Monte Carlo.
 */
import { CholeskyEngine } from "./CholeskyEngine.js";
import { nelsonSPCRulesEngine } from "./NelsonSPCRulesEngine.js";

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface SPCInput {
  measurements: number[];
  nominal: number;
  upper_tolerance: number;
  lower_tolerance: number;
  subgroup_size?: number;
  specification?: string;
  feature_name?: string;
  /** Measurement uncertainty (±1σ, same unit as measurements). When provided,
   *  Monte Carlo propagation computes conservative Cpk bounds per ISO 22514-1. */
  measurement_uncertainty?: number;
}

export interface ControlChartLimits {
  ucl: number; // upper control limit
  lcl: number; // lower control limit
  cl: number;  // center line (mean)
  ucl_range: number;
  lcl_range: number;
  cl_range: number;
}

export interface NelsonViolation {
  rule: number;
  description: string;
  points: number[];
}

export interface SPCResult {
  sample_stats: {
    n: number;
    mean: number;
    std_dev: number;
    min: number;
    max: number;
    range: number;
    median: number;
  };
  capability: {
    cp: number;
    cpk: number;
    pp: number;
    ppk: number;
    cpm: number;
    sigma_level: number;
    /** Conservative lower bound Cpk accounting for measurement uncertainty (ISO 22514-1) */
    cpk_lower?: number;
    /** Upper bound Cpk */
    cpk_upper?: number;
  };
  predicted_defects: {
    ppm_total: number;
    ppm_upper: number;
    ppm_lower: number;
    pct_out_of_spec: number;
    yield_pct: number;
  };
  control_chart: ControlChartLimits;
  nelson_violations: NelsonViolation[];
  process_assessment: "capable" | "marginal" | "not_capable";
  centering: "centered" | "shifted_high" | "shifted_low";
  recommendations: string[];
}

export class SPCProcessCapabilityEngine {
  compute(input: SPCInput): AtomicValue<SPCResult> {
    const { measurements, nominal, upper_tolerance, lower_tolerance } = input;
    const n = measurements.length;
    if (n < 2) {
      return this.emptyResult(input);
    }

    const usl = nominal + upper_tolerance;
    const lsl = nominal - lower_tolerance;
    const tolerance = usl - lsl;

    // Basic statistics
    const mean = measurements.reduce((s, v) => s + v, 0) / n;
    const variance = measurements.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const sorted = [...measurements].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    // Within-subgroup variation (for Cp/Cpk)
    const subgroupSize = input.subgroup_size || Math.min(5, Math.max(2, Math.floor(n / 5)));
    const withinStdDev = this.withinGroupStdDev(measurements, subgroupSize);

    // Capability indices
    const cp = tolerance / (6 * withinStdDev);
    const cpu = (usl - mean) / (3 * withinStdDev);
    const cpl = (mean - lsl) / (3 * withinStdDev);
    const cpk = Math.min(cpu, cpl);

    // Performance indices (overall, using total std dev)
    const pp = tolerance / (6 * stdDev);
    const ppu = (usl - mean) / (3 * stdDev);
    const ppl = (mean - lsl) / (3 * stdDev);
    const ppk = Math.min(ppu, ppl);

    // Cpm (Taguchi capability)
    const targetDev = Math.sqrt(variance + Math.pow(mean - nominal, 2));
    const cpm = tolerance / (6 * targetDev);

    // Sigma level
    const sigmaLevel = cpk * 3;

    // Predicted defects (normal distribution)
    const zUpper = (usl - mean) / stdDev;
    const zLower = (mean - lsl) / stdDev;
    const ppmUpper = Math.round(this.normalCDF(-zUpper) * 1e6);
    const ppmLower = Math.round(this.normalCDF(-zLower) * 1e6);
    const ppmTotal = ppmUpper + ppmLower;
    const yieldPct = Math.round((1 - ppmTotal / 1e6) * 10000) / 100;

    // Control chart limits (X-bar chart)
    const A2 = this.getA2(subgroupSize);
    const D3 = this.getD3(subgroupSize);
    const D4 = this.getD4(subgroupSize);
    const avgRange = this.averageRange(measurements, subgroupSize);

    const controlChart: ControlChartLimits = {
      cl: Math.round(mean * 10000) / 10000,
      ucl: Math.round((mean + A2 * avgRange) * 10000) / 10000,
      lcl: Math.round((mean - A2 * avgRange) * 10000) / 10000,
      cl_range: Math.round(avgRange * 10000) / 10000,
      ucl_range: Math.round(D4 * avgRange * 10000) / 10000,
      lcl_range: Math.round(Math.max(0, D3 * avgRange) * 10000) / 10000,
    };

    // Nelson rule violations
    const violations = this.checkNelsonRules(measurements, mean, stdDev);

    // Process assessment
    const assessment = cpk >= 1.33 ? "capable" as const
      : cpk >= 1.0 ? "marginal" as const
      : "not_capable" as const;

    // Centering analysis
    const centerOffset = (mean - nominal) / (tolerance / 2);
    const centering = Math.abs(centerOffset) < 0.1 ? "centered" as const
      : centerOffset > 0 ? "shifted_high" as const
      : "shifted_low" as const;

    // Recommendations
    const recs: string[] = [];
    if (assessment === "not_capable") {
      recs.push(`Cpk=${cpk.toFixed(2)} < 1.0 — process not capable. Reduce variation or widen tolerance.`);
    } else if (assessment === "marginal") {
      recs.push(`Cpk=${cpk.toFixed(2)} marginal — target Cpk ≥ 1.33 for production.`);
    }
    if (centering !== "centered") {
      const shift_um = Math.round((mean - nominal) * 1000);
      recs.push(`Process shifted ${centering === "shifted_high" ? "high" : "low"} by ${Math.abs(shift_um)}μm — adjust offset.`);
    }
    if (violations.length > 0) {
      recs.push(`${violations.length} Nelson rule violation(s) detected — investigate assignable causes.`);
    }
    if (cp > 1.33 && cpk < 1.0) {
      recs.push("Cp adequate but Cpk low — process is capable but off-center. Adjust mean.");
    }
    if (ppmTotal > 100) {
      recs.push(`Predicted ${ppmTotal} PPM defects (${(ppmTotal / 10000).toFixed(2)}%) — implement SPC monitoring.`);
    }

    // ISO 22514-1 measurement uncertainty propagation via Cholesky-backed Monte Carlo
    let cpk_lower: number | undefined;
    let cpk_upper: number | undefined;
    const mU = input.measurement_uncertainty;
    if (mU && mU > 0 && n >= 5) {
      const nSamples = 500;
      // Diagonal covariance L = diag(mU) — each measurement has independent uncertainty
      const L = new Array(n).fill(0).map(() => new Array(n).fill(0));
      for (let i = 0; i < n; i++) L[i][i] = mU;
      try {
        const cpkSamples: number[] = [];
        // Box-Muller standard normal generator
        const boxMuller = (): number => {
          const u1 = Math.random(), u2 = Math.random();
          return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        };
        for (let s = 0; s < nSamples; s++) {
          const z = Array.from({ length: n }, () => boxMuller());
          const perturbed = CholeskyEngine.sampleMultivariateNormal(measurements, L, z);
          const sMean = perturbed.reduce((sum, v) => sum + v, 0) / n;
          // Use σ_within via moving range (MR̄/d2) for Cpk, not σ_overall
          // This matches the primary Cpk computation which uses R̄/d2
          let mrSum = 0;
          for (let mi = 1; mi < perturbed.length; mi++) {
            mrSum += Math.abs(perturbed[mi] - perturbed[mi - 1]);
          }
          const mrBar = perturbed.length > 1 ? mrSum / (perturbed.length - 1) : 0;
          const sStdWithin = mrBar / 1.128; // d2 for n=2 (moving range subgroup)
          if (sStdWithin < 1e-15) continue;
          const sCpu = (usl - sMean) / (3 * sStdWithin);
          const sCpl = (sMean - lsl) / (3 * sStdWithin);
          cpkSamples.push(Math.min(sCpu, sCpl));
        }
        if (cpkSamples.length > 10) {
          cpkSamples.sort((a, b) => a - b);
          cpk_lower = cpkSamples[Math.floor(cpkSamples.length * 0.05)]; // 5th percentile
          cpk_upper = cpkSamples[Math.floor(cpkSamples.length * 0.95)]; // 95th percentile
          recs.push(
            `Measurement uncertainty ±${(mU * 1000).toFixed(1)}μm propagated: ` +
            `Cpk 90% CI = [${cpk_lower!.toFixed(2)}, ${cpk_upper!.toFixed(2)}]. ` +
            `Use Cpk_lower=${cpk_lower!.toFixed(2)} for conservative decisions.`
          );
        }
      } catch {
        // Cholesky failed — skip uncertainty propagation
      }
    }

    const result: SPCResult = {
      sample_stats: {
        n,
        mean: Math.round(mean * 10000) / 10000,
        std_dev: Math.round(stdDev * 10000) / 10000,
        min: Math.round(min * 10000) / 10000,
        max: Math.round(max * 10000) / 10000,
        range: Math.round((max - min) * 10000) / 10000,
        median: Math.round(median * 10000) / 10000,
      },
      capability: {
        cp: Math.round(cp * 100) / 100,
        cpk: Math.round(cpk * 100) / 100,
        pp: Math.round(pp * 100) / 100,
        ppk: Math.round(ppk * 100) / 100,
        cpm: Math.round(cpm * 100) / 100,
        sigma_level: Math.round(sigmaLevel * 100) / 100,
        ...(cpk_lower !== undefined && { cpk_lower: Math.round(cpk_lower * 100) / 100 }),
        ...(cpk_upper !== undefined && { cpk_upper: Math.round(cpk_upper * 100) / 100 }),
      },
      predicted_defects: {
        ppm_total: ppmTotal,
        ppm_upper: ppmUpper,
        ppm_lower: ppmLower,
        pct_out_of_spec: Math.round((ppmTotal / 10000) * 100) / 100,
        yield_pct: yieldPct,
      },
      control_chart: controlChart,
      nelson_violations: violations,
      process_assessment: assessment,
      centering,
      recommendations: recs,
    };

    return {
      value: result,
      unit: "capability_index",
      formula: "Cp=T/(6σ_w), Cpk=min((USL-μ)/(3σ),(μ-LSL)/(3σ))",
      confidence: n >= 30 ? 0.9 : n >= 10 ? 0.75 : 0.5,
    };
  }

  private withinGroupStdDev(data: number[], subgroupSize: number): number {
    const ranges: number[] = [];
    for (let i = 0; i < data.length - subgroupSize + 1; i += subgroupSize) {
      const group = data.slice(i, i + subgroupSize);
      ranges.push(Math.max(...group) - Math.min(...group));
    }
    if (ranges.length === 0) return Math.sqrt(data.reduce((s, v, _, a) => s + Math.pow(v - a.reduce((x, y) => x + y, 0) / a.length, 2), 0) / (data.length - 1));
    const avgRange = ranges.reduce((s, r) => s + r, 0) / ranges.length;
    const d2 = this.getD2(subgroupSize);
    return avgRange / d2;
  }

  private averageRange(data: number[], subgroupSize: number): number {
    const ranges: number[] = [];
    for (let i = 0; i < data.length - subgroupSize + 1; i += subgroupSize) {
      const group = data.slice(i, i + subgroupSize);
      ranges.push(Math.max(...group) - Math.min(...group));
    }
    return ranges.length > 0 ? ranges.reduce((s, r) => s + r, 0) / ranges.length : 0;
  }

  private normalCDF(z: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Delegate to NelsonSPCRulesEngine for all 8 Nelson rules (was 3/8 inline).
   * Ref: Nelson (1984), Journal of Quality Technology, 16(4), 237-239
   */
  private checkNelsonRules(data: number[], mean: number, stdDev: number): NelsonViolation[] {
    if (stdDev === 0 || data.length < 2) return [];
    try {
      const result = nelsonSPCRulesEngine.evaluateAllRules(data, mean, stdDev);
      // Map NelsonSPCRulesEngine format to our NelsonViolation format
      return (result.violations || []).map((v: any) => ({
        rule: v.rule_number ?? v.rule,
        description: v.description ?? `Nelson Rule ${v.rule_number ?? v.rule}`,
        points: v.violating_indices ?? v.points ?? [],
      }));
    } catch {
      return []; // graceful degradation if Nelson engine unavailable
    }
  }

  // SPC constants
  private getD2(n: number): number {
    const d2 = [0, 0, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.970, 3.078];
    return d2[Math.min(n, 10)] || 2.326;
  }
  private getA2(n: number): number {
    const a2 = [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308];
    return a2[Math.min(n, 10)] || 0.577;
  }
  private getD3(n: number): number {
    const d3 = [0, 0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223];
    return d3[Math.min(n, 10)] || 0;
  }
  private getD4(n: number): number {
    const d4 = [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777];
    return d4[Math.min(n, 10)] || 2.114;
  }

  private emptyResult(input: SPCInput): AtomicValue<SPCResult> {
    return {
      value: {
        sample_stats: { n: input.measurements.length, mean: 0, std_dev: 0, min: 0, max: 0, range: 0, median: 0 },
        capability: { cp: 0, cpk: 0, pp: 0, ppk: 0, cpm: 0, sigma_level: 0 },
        predicted_defects: { ppm_total: 0, ppm_upper: 0, ppm_lower: 0, pct_out_of_spec: 0, yield_pct: 0 },
        control_chart: { ucl: 0, lcl: 0, cl: 0, ucl_range: 0, lcl_range: 0, cl_range: 0 },
        nelson_violations: [],
        process_assessment: "not_capable",
        centering: "centered",
        recommendations: ["Insufficient data — need at least 2 measurements"],
      },
      unit: "capability_index",
      formula: "insufficient_data",
      confidence: 0,
    };
  }
}

export const spcProcessCapabilityEngine = new SPCProcessCapabilityEngine();
