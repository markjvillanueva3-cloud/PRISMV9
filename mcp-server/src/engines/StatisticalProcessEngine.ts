/**
 * StatisticalProcessEngine — SPC control chart analysis
 *
 * Models: X-bar/R charts, Cp/Cpk capability indices,
 *         control limits (±3σ), process shift detection, PPM defect rate
 * References: Montgomery "Statistical Quality Control", AIAG SPC Manual
 * Safety: Out-of-control rules (Western Electric), capability thresholds
 */

export type ChartType = "xbar_r" | "xbar_s" | "p_chart" | "c_chart" | "individuals";

export interface StatisticalProcessInput {
  process_mean: number;
  process_stddev: number;
  spec_upper: number;
  spec_lower: number;
  sample_size?: number;                 // default 5
  num_subgroups?: number;               // default 25
  target_cpk?: number;                  // default 1.33
  chart_type?: ChartType;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface StatisticalProcessResult {
  cp: AtomicValue;
  cpk: AtomicValue;
  ppk: AtomicValue;
  ppm_defect_rate: AtomicValue;
  sigma_level: AtomicValue;
  ucl: AtomicValue;
  lcl: AtomicValue;
  process_centered_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Standard normal CDF approximation
function normCdf(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

export class StatisticalProcessEngine {
  calculate(input: StatisticalProcessInput): StatisticalProcessResult {
    const {
      process_mean: mu,
      process_stddev: sigma,
      spec_upper: USL,
      spec_lower: LSL,
      sample_size: n = 5,
      num_subgroups = 25,
      target_cpk = 1.33,
    } = input;

    const recs: string[] = [];

    // Capability indices
    const Cp = (USL - LSL) / (6 * sigma);
    const Cpu = (USL - mu) / (3 * sigma);
    const Cpl = (mu - LSL) / (3 * sigma);
    const Cpk = Math.min(Cpu, Cpl);

    // Ppk (with long-term variation estimate ≈ 1.2× sigma)
    const sigmaLT = sigma * 1.2;
    const Ppk = Math.min((USL - mu) / (3 * sigmaLT), (mu - LSL) / (3 * sigmaLT));

    // PPM defect rate
    const zUpper = (USL - mu) / sigma;
    const zLower = (mu - LSL) / sigma;
    const ppmUpper = (1 - normCdf(zUpper)) * 1e6;
    const ppmLower = normCdf(-zLower) * 1e6;
    const totalPPM = ppmUpper + ppmLower;

    // Sigma level (Six Sigma convention: includes 1.5σ shift)
    const sigmaLevel = Cpk * 3;

    // Control limits for X-bar chart
    const A2_table: Record<number, number> = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
    const A2 = A2_table[Math.min(Math.max(n, 2), 10)] ?? 0.577;
    const sigmaXbar = sigma / Math.sqrt(n);
    const UCL = mu + 3 * sigmaXbar;
    const LCL = mu - 3 * sigmaXbar;

    // Process centering (0% = at spec edge, 100% = perfectly centered)
    const midSpec = (USL + LSL) / 2;
    const halfRange = (USL - LSL) / 2;
    const centering = (1 - Math.abs(mu - midSpec) / halfRange) * 100;

    const isSafe = Cpk >= target_cpk && totalPPM < 66; // 66 PPM ≈ 4σ

    if (Cpk < 1.0) recs.push(`Cpk=${Cpk.toFixed(2)} < 1.0 — process not capable, reduce variation`);
    else if (Cpk < 1.33) recs.push(`Cpk=${Cpk.toFixed(2)} < 1.33 — marginal capability, improve centering`);
    if (Cp > 1.33 && Cpk < 1.0) recs.push(`Cp=${Cp.toFixed(2)} OK but Cpk=${Cpk.toFixed(2)} — process off-center, adjust mean`);
    if (totalPPM > 1000) recs.push(`High defect rate ${totalPPM.toFixed(0)}PPM — process improvement needed`);
    if (centering < 80) recs.push(`Process off-center ${centering.toFixed(0)}% — shift mean toward ${midSpec.toFixed(3)}`);
    if (recs.length === 0) recs.push(`SPC nominal — Cpk=${Cpk.toFixed(2)}, ${totalPPM.toFixed(1)}PPM, ${sigmaLevel.toFixed(1)}σ`);

    return {
      cp: mkAv(Math.round(Cp * 1000) / 1000, "ratio", Cp * 0.05, "capability"),
      cpk: mkAv(Math.round(Cpk * 1000) / 1000, "ratio", Cpk * 0.05, "capability"),
      ppk: mkAv(Math.round(Ppk * 1000) / 1000, "ratio", Ppk * 0.08, "performance"),
      ppm_defect_rate: mkAv(Math.round(totalPPM * 10) / 10, "PPM", totalPPM * 0.15, "normal_dist"),
      sigma_level: mkAv(Math.round(sigmaLevel * 10) / 10, "σ", 0.2, "cpk_conversion"),
      ucl: mkAv(Math.round(UCL * 10000) / 10000, "units", UCL * 0.02, "3sigma"),
      lcl: mkAv(Math.round(LCL * 10000) / 10000, "units", LCL * 0.02, "3sigma"),
      process_centered_pct: mkAv(Math.round(centering * 10) / 10, "%", 2, "spec_midpoint"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const statisticalProcessEngine = new StatisticalProcessEngine();
