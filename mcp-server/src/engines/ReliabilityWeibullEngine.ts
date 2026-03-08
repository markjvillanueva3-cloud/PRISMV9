/**
 * ReliabilityWeibullEngine — Weibull reliability analysis
 *
 * Models: Weibull distribution (R(t)=e^(-(t/η)^β)), MTTF,
 *         failure rate, B-life (B10, B50), confidence bounds
 * References: Abernethy "The New Weibull Handbook", MIL-HDBK-217
 * Safety: Warranty period, replacement interval, redundancy
 */

export interface ReliabilityWeibullInput {
  shape_parameter_beta: number;         // β (slope)
  scale_parameter_eta: number;          // η (characteristic life)
  mission_time?: number;                // default η/2
  confidence_pct?: number;              // default 90
  sample_size?: number;                 // default 20 (for bounds)
  num_failures?: number;                // default 10
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ReliabilityWeibullResult {
  reliability_at_mission: AtomicValue;
  mttf: AtomicValue;
  b10_life: AtomicValue;
  b50_life: AtomicValue;
  failure_rate_at_mission: AtomicValue;
  mean_residual_life: AtomicValue;
  warranty_return_pct: AtomicValue;
  failure_mode: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Gamma function approximation (Stirling)
function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = C[0];
  for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export class ReliabilityWeibullEngine {
  calculate(input: ReliabilityWeibullInput): ReliabilityWeibullResult {
    const {
      shape_parameter_beta: beta,
      scale_parameter_eta: eta,
      confidence_pct = 90,
      sample_size: n = 20,
      num_failures: r = 10,
    } = input;

    const recs: string[] = [];
    const t = input.mission_time ?? eta / 2;

    // Reliability: R(t) = exp(-(t/η)^β)
    const R = Math.exp(-Math.pow(t / eta, beta));

    // MTTF = η × Γ(1 + 1/β)
    const mttf = eta * gamma(1 + 1 / beta);

    // B-lives: t_p = η × (-ln(1-p))^(1/β)
    const b10 = eta * Math.pow(-Math.log(0.90), 1 / beta);
    const b50 = eta * Math.pow(-Math.log(0.50), 1 / beta);

    // Failure rate: λ(t) = (β/η) × (t/η)^(β-1)
    const lambda = (beta / eta) * Math.pow(t / eta, beta - 1);

    // Mean residual life at mission time
    // MRL(t) = MTTF × (1 - incomplete gamma) / R(t) - t (approximate)
    const mrl = (mttf - t * (1 - R)) / R;

    // Warranty return percentage (at t = warranty period)
    const warrantyReturn = (1 - R) * 100;

    // Failure mode interpretation
    const failureMode = beta < 1 ? 1 : beta < 2 ? 2 : beta < 4 ? 3 : 4;
    const failureModeStr = beta < 1 ? "infant_mortality"
      : beta < 2 ? "early_wear" : beta < 4 ? "normal_wear" : "rapid_wear";

    const isSafe = R > 0.90;

    if (beta < 1) recs.push(`β=${beta} < 1 — infant mortality, improve QC/burn-in`);
    if (beta > 3.5) recs.push(`β=${beta} > 3.5 — rapid wearout, schedule preventive replacement at B10`);
    if (R < 0.95) recs.push(`Reliability ${(R * 100).toFixed(1)}% at t=${t} — consider redundancy`);
    if (warrantyReturn > 5) recs.push(`${warrantyReturn.toFixed(1)}% warranty returns — cost impact significant`);
    if (n < 10) recs.push(`Small sample n=${n} — wide confidence bounds, collect more data`);
    if (recs.length === 0) recs.push(`Reliability nominal — R(${t})=${(R * 100).toFixed(1)}%, MTTF=${mttf.toFixed(0)}, B10=${b10.toFixed(0)}`);

    return {
      reliability_at_mission: mkAv(Math.round(R * 10000) / 10000, "ratio", R * 0.03, "weibull"),
      mttf: mkAv(Math.round(mttf * 10) / 10, "hours", mttf * 0.08, "gamma_function"),
      b10_life: mkAv(Math.round(b10 * 10) / 10, "hours", b10 * 0.10, "quantile"),
      b50_life: mkAv(Math.round(b50 * 10) / 10, "hours", b50 * 0.08, "quantile"),
      failure_rate_at_mission: mkAv(lambda, "per_hour", lambda * 0.10, "hazard_function",
        failureModeStr),
      mean_residual_life: mkAv(Math.round(mrl * 10) / 10, "hours", mrl * 0.12, "conditional"),
      warranty_return_pct: mkAv(Math.round(warrantyReturn * 100) / 100, "%", warrantyReturn * 0.10, "cdf"),
      failure_mode: mkAv(failureMode, "mode_code", 0, "beta_interpretation", failureModeStr),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const reliabilityWeibullEngine = new ReliabilityWeibullEngine();
