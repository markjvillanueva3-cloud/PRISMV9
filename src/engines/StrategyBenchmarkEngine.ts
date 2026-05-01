/**
 * StrategyBenchmarkEngine — Physics + Monte Carlo Strategy Benchmarking
 *
 * For each candidate strategy applied to a given feature/material/tool/machine,
 * computes predicted performance using physics models and 500-trial Monte Carlo:
 *
 *   • Cycle time    — MRR = ae × ap × Vf; volume / MRR + overhead
 *   • Tool life     — Taylor T = (C/Vc)^(1/n); Weibull distribution from MC
 *   • Surface finish Ra — fz²/(32·r) with deflection correction
 *   • Cpk prediction — from Ra distribution vs tolerance (MC)
 *   • Cost per part — material + machining + tool amortization
 *
 * Methods:
 *   benchmark(strategy, feature, material, tool, machine)
 *   compareBenchmarks(strategies[], feature, material, tool, machine)
 *   monteCarloBenchmark(strategy, feature, material, tool, machine, trials?)
 *
 * @engine StrategyBenchmarkEngine
 * @shortcode E1096
 * @dispatcher camDispatcher
 * @actions strategy_benchmark, strategy_benchmark_compare, strategy_benchmark_monte_carlo
 * @milestone CAMX-MS12/U02
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BenchmarkStrategy {
  /** Unique strategy identifier, e.g. "hm_optimized_roughing" */
  strategy_id: string;
  /** Radial depth of cut ae, mm */
  ae_mm: number;
  /** Axial depth of cut ap, mm */
  ap_mm: number;
  /** Feed per tooth fz, mm/tooth */
  fz_mm: number;
  /** Cutting speed Vc, m/min */
  vc_m_min: number;
  /** Overhead time (retract, approach, rapid) per op, min */
  overhead_min?: number;
  /** Strategy category, e.g. "roughing" | "finishing" | "hsm" */
  category?: string;
}

export interface BenchmarkFeature {
  /** Volume of material to remove, cm³ */
  volume_cm3: number;
  /** Required surface tolerance (bilateral, ±), mm */
  tolerance_mm: number;
  /** Feature type, e.g. "pocket" | "contour" | "slot" */
  type?: string;
}

export interface BenchmarkMaterial {
  /** Specific cutting force coefficient kc1_1, N/mm² */
  kc1_1_n_mm2: number;
  /** Chip thickness exponent mc (dimensionless, typically 0.2–0.4) */
  mc: number;
  /** Material cost per cm³, USD */
  cost_per_cm3_usd?: number;
  /** Density, g/cm³ (for mass-based cost if cost_per_kg given) */
  density_g_cm3?: number;
  /** Cost per kg, USD (alternative to cost_per_cm3_usd) */
  cost_per_kg_usd?: number;
  /** Taylor C constant for tool life, m/min */
  taylor_C: number;
  /** Taylor n exponent */
  taylor_n: number;
}

export interface BenchmarkTool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Corner/nose radius r, mm */
  corner_radius_mm: number;
  /** Tool overhang, mm (for deflection correction) */
  overhang_mm: number;
  /** Tool purchase cost, USD */
  cost_usd: number;
  /** Expected tool life index (parts before replacement, baseline) */
  expected_parts?: number;
}

export interface BenchmarkMachine {
  /** Machine hourly rate, USD/hr */
  rate_usd_hr: number;
  /** Spindle power available, kW */
  spindle_power_kw: number;
  /** Machine overhead per part (setup amortized), USD */
  overhead_usd_per_part?: number;
}

export interface WeibullParams {
  /** Weibull shape parameter β (beta) */
  beta: number;
  /** Weibull scale parameter η (eta), min */
  eta: number;
}

export interface CI95<T = number> {
  lower: T;
  upper: T;
}

export interface StrategyBenchmarkResult {
  strategy_id: string;
  /** Mean cycle time, min */
  cycle_time_min: number;
  /** 95% CI for cycle time, min */
  cycle_time_ci95: CI95;
  /** Mean tool life, min */
  tool_life_min: number;
  /** Weibull distribution params fit to MC tool life samples */
  tool_life_weibull: WeibullParams;
  /** Mean surface roughness Ra, µm */
  Ra_um: number;
  /** 95% CI for Ra, µm */
  Ra_ci95: CI95;
  /** Predicted Cpk from Ra distribution vs tolerance */
  Cpk_predicted: number;
  /** Mean cost per part, USD */
  cost_per_part: number;
  /** 95% CI for cost per part, USD */
  cost_ci95: CI95;
  /** Composite score (0–100, higher = better) */
  score: number;
}

export interface RankedBenchmark {
  rank: number;
  result: StrategyBenchmarkResult;
  delta_vs_best_pct: number;
}

export interface MonteCarloDetail {
  result: StrategyBenchmarkResult;
  /** Full distribution for cycle time, min */
  cycle_time_samples: number[];
  /** Full distribution for tool life, min */
  tool_life_samples: number[];
  /** Full distribution for Ra, µm */
  Ra_samples: number[];
  /** Full distribution for cost, USD */
  cost_samples: number[];
  trials: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default machine rate USD/hr if not provided */
const DEFAULT_MACHINE_RATE_USD_HR = 85;
/** Default material cost USD/cm³ if not provided (mild steel) */
const DEFAULT_MATERIAL_COST_USD_CM3 = 0.008;
/** Default machine overhead USD/part */
const DEFAULT_OVERHEAD_USD_PART = 0.50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Box-Muller normal random sample. */
function randn(): number {
  const u = 1 - Math.random(); // avoid log(0)
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Sorted percentile from a sample array (simple linear interpolation). */
function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

/**
 * Fit Weibull (shape β, scale η) to a sample via MLE approximation.
 * Uses the Menon (1963) / iterative Newton approach for β, then solves for η.
 */
function fitWeibull(samples: number[]): WeibullParams {
  const n = samples.length;
  if (n < 2) return { beta: 1, eta: samples[0] ?? 1 };

  // Initialise β from coefficient of variation approximation
  const mean = samples.reduce((s, v) => s + v, 0) / n;
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const cv = Math.sqrt(variance) / (mean || 1);
  // Rough starting estimate: β ≈ 1.2 / cv  (for cv in range 0.1–1.0)
  let beta = Math.max(0.5, 1.2 / (cv || 0.3));

  // One Newton iteration with the log-sum MLE equations
  for (let iter = 0; iter < 10; iter++) {
    const logX = samples.map(x => Math.log(Math.max(x, 1e-9)));
    const xBeta = samples.map(x => Math.pow(Math.max(x, 1e-9), beta));
    const sumXBeta = xBeta.reduce((s, v) => s + v, 0);
    const sumXBetaLogX = samples.reduce((s, x, i) => s + xBeta[i] * logX[i], 0);
    const sumLogX = logX.reduce((s, v) => s + v, 0);

    // MLE equation: 1/β + (1/n)·Σlog(x_i) - Σ(x_i^β·log(x_i)) / Σ(x_i^β) = 0
    const g = 1 / beta + sumLogX / n - sumXBetaLogX / sumXBeta;

    // Derivative for Newton step
    const sumXBetaLogX2 = samples.reduce((s, x, i) => s + xBeta[i] * logX[i] ** 2, 0);
    const dgdbeta = -1 / (beta ** 2)
      - (sumXBetaLogX2 * sumXBeta - sumXBetaLogX ** 2) / (sumXBeta ** 2);

    const step = g / (dgdbeta || -1);
    beta = Math.max(0.2, beta - step);
    if (Math.abs(step) < 1e-6) break;
  }

  // Scale: η = (Σx_i^β / n)^(1/β)
  const eta = Math.pow(
    samples.reduce((s, x) => s + Math.pow(Math.max(x, 1e-9), beta), 0) / n,
    1 / beta,
  );

  return { beta: parseFloat(beta.toFixed(4)), eta: parseFloat(eta.toFixed(4)) };
}

/** Compute Cpk from a Ra sample array against an upper spec limit. */
function computeCpk(samples: number[], usl: number): number {
  const n = samples.length;
  const mean = samples.reduce((s, v) => s + v, 0) / n;
  const sigma = Math.sqrt(samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1));
  if (sigma <= 0) return 9.99;
  // LSL = 0 (Ra cannot be negative); USL = usl
  const cpkU = (usl - mean) / (3 * sigma);
  const cpkL = mean / (3 * sigma);
  return parseFloat(Math.min(cpkU, cpkL).toFixed(3));
}

/** Composite score 0–100 based on normalized cycle time, tool life, Ra and cost. */
function computeScore(
  cycleTime: number, toolLife: number, ra: number, cost: number,
  refs: { maxCycle: number; minToolLife: number; maxRa: number; maxCost: number },
): number {
  // Normalise each metric to 0–1 (1 = best)
  const sCycle    = refs.maxCycle > 0 ? Math.max(0, 1 - cycleTime / refs.maxCycle) : 0.5;
  const sToolLife = refs.minToolLife > 0 ? Math.min(1, toolLife / (refs.minToolLife * 4)) : 0.5;
  const sRa       = refs.maxRa > 0 ? Math.max(0, 1 - ra / refs.maxRa) : 0.5;
  const sCost     = refs.maxCost > 0 ? Math.max(0, 1 - cost / refs.maxCost) : 0.5;
  // Weighted sum: cycle 30%, tool life 25%, Ra 25%, cost 20%
  return parseFloat(((sCycle * 30 + sToolLife * 25 + sRa * 25 + sCost * 20)).toFixed(1));
}

// ─── Core Physics ─────────────────────────────────────────────────────────────

/**
 * Compute Ra using scallop/chip-thickness model with deflection correction.
 *
 * Base: Ra = fz² / (32 · r)   [mm → µm × 1000]
 * Deflection correction: d = Fc · L³ / (3·E·I) where for simplified model,
 * we use kc1_1 and area chip as proxy for cutting force, and stiffness ∝ 1/L³.
 * Net: Ra_corrected = Ra_base × (1 + 0.08 · (fz / (D/2)) · (L / D)²)
 */
function computeRaBase(fz: number, r: number, overhang: number, D: number): number {
  const raBase_mm = (fz * fz) / (32 * Math.max(r, 0.01));
  const raBase_um = raBase_mm * 1000;
  // Deflection factor: modest sensitivity to L/D ratio
  const LD = overhang / Math.max(D, 0.1);
  const deflFactor = 1 + 0.08 * (fz / Math.max(D / 2, 0.01)) * (LD ** 2);
  return raBase_um * deflFactor;
}

/**
 * Compute Taylor tool life T (minutes).
 * T = (C / Vc)^(1/n)
 */
function taylorToolLife(Vc: number, C: number, n: number): number {
  return Math.pow(C / Math.max(Vc, 1), 1 / Math.max(n, 0.01));
}

/**
 * Compute MRR (mm³/min).
 * MRR = ae × ap × Vf where Vf = fz × z × n_rpm and n_rpm = Vc*1000/(π·D)
 */
function computeMRR(strategy: BenchmarkStrategy, tool: BenchmarkTool): number {
  const D = tool.diameter_mm;
  const n_rpm = (strategy.vc_m_min * 1000) / (Math.PI * Math.max(D, 0.1));
  const Vf = strategy.fz_mm * tool.flute_count * n_rpm; // mm/min
  const mrr = strategy.ae_mm * strategy.ap_mm * Vf; // mm³/min
  return Math.max(mrr, 0.001);
}

// ─── Monte Carlo Core ─────────────────────────────────────────────────────────

interface MCInputs {
  kc1_1: number;
  mc: number;
  taylor_C: number;
  taylor_n: number;
}

/**
 * Run N Monte Carlo trials for a single strategy.
 * Perturbs: ±10% kc1_1 (normal), ±7% mc (normal)
 * Returns raw sample arrays.
 */
function runMCTrials(
  strategy: BenchmarkStrategy,
  feature: BenchmarkFeature,
  material: BenchmarkMaterial,
  tool: BenchmarkTool,
  machine: BenchmarkMachine,
  trials: number,
): { cycleTime: number[]; toolLife: number[]; Ra: number[]; cost: number[] } {
  const cycleTime: number[] = [];
  const toolLife: number[] = [];
  const Ra: number[] = [];
  const cost: number[] = [];

  const overhead = strategy.overhead_min ?? 0.5;
  const materialCostPerCm3 = material.cost_per_cm3_usd
    ?? (material.density_g_cm3 && material.cost_per_kg_usd
        ? (material.density_g_cm3 * material.cost_per_kg_usd) / 1000
        : DEFAULT_MATERIAL_COST_USD_CM3);
  const machineRatePerMin = (machine.rate_usd_hr ?? DEFAULT_MACHINE_RATE_USD_HR) / 60;
  const overheadUsd = machine.overhead_usd_per_part ?? DEFAULT_OVERHEAD_USD_PART;

  const vol_mm3 = feature.volume_cm3 * 1000; // cm³ → mm³

  for (let i = 0; i < trials; i++) {
    // Perturb material constants
    const kc = material.kc1_1_n_mm2 * (1 + 0.10 * randn());
    const mc = material.mc * (1 + 0.07 * randn());

    // MRR — kc/mc variation affects cutting conditions (slight Vc perturbation via chip thickness)
    const chipArea = strategy.fz_mm * strategy.ap_mm;
    const kc_eff = kc * Math.pow(Math.max(chipArea, 0.001), -mc); // N/mm²
    // Effective MRR slightly dampened by cutting force ratio
    const mrrNominal = computeMRR(strategy, tool);
    const forceRatio = Math.min(kc_eff / (material.kc1_1_n_mm2 || 1), 2.0);
    // Feed efficiency: higher force → small feed slow-down (±5% effect)
    const mrrEff = mrrNominal * (1 - 0.05 * (forceRatio - 1));
    const ctMachining = vol_mm3 / Math.max(mrrEff, 0.001) / 1000 * 1; // mm³/min → min (MRR in mm³/min)
    const ct = ctMachining + overhead;
    cycleTime.push(ct);

    // Tool life — Taylor with same kc perturbation effect
    // Higher kc → higher temp → lower effective C (−2% per 1% kc increase)
    const deltaKc = (kc - material.kc1_1_n_mm2) / material.kc1_1_n_mm2;
    const C_eff = material.taylor_C * (1 - 2 * deltaKc);
    const tl = taylorToolLife(strategy.vc_m_min, Math.max(C_eff, 1), material.taylor_n);
    toolLife.push(Math.max(tl, 0.1));

    // Ra — fz variation (±3% noise on fz) + deflection
    const fzPerturbed = strategy.fz_mm * (1 + 0.03 * randn());
    const ra = computeRaBase(
      Math.max(fzPerturbed, 0.001),
      tool.corner_radius_mm,
      tool.overhang_mm,
      tool.diameter_mm,
    );
    Ra.push(Math.max(ra, 0.01));

    // Cost per part
    const materialCost = feature.volume_cm3 * materialCostPerCm3;
    const machiningCost = ct * machineRatePerMin;
    const toolAmort = ct / Math.max(tl, 0.01) * tool.cost_usd;
    const costTotal = materialCost + machiningCost + toolAmort + overheadUsd;
    cost.push(Math.max(costTotal, 0.01));
  }

  return { cycleTime, toolLife, Ra, cost };
}

/**
 * Summarise MC samples into a StrategyBenchmarkResult.
 * The refs object is used for scoring — pass aggregate refs across all strategies.
 */
function summariseMC(
  strategyId: string,
  samples: ReturnType<typeof runMCTrials>,
  feature: BenchmarkFeature,
  refs: { maxCycle: number; minToolLife: number; maxRa: number; maxCost: number },
): StrategyBenchmarkResult {
  const sortedCT = [...samples.cycleTime].sort((a, b) => a - b);
  const sortedTL = [...samples.toolLife].sort((a, b) => a - b);
  const sortedRa = [...samples.Ra].sort((a, b) => a - b);
  const sortedCost = [...samples.cost].sort((a, b) => a - b);

  const meanOf = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const cycle_time_min = parseFloat(meanOf(sortedCT).toFixed(4));
  const tool_life_min  = parseFloat(meanOf(sortedTL).toFixed(4));
  const Ra_um          = parseFloat(meanOf(sortedRa).toFixed(4));
  const cost_per_part  = parseFloat(meanOf(sortedCost).toFixed(4));

  const ci95CT   = { lower: parseFloat(percentile(sortedCT, 0.025).toFixed(4)), upper: parseFloat(percentile(sortedCT, 0.975).toFixed(4)) };
  const ci95TL   = { lower: parseFloat(percentile(sortedTL, 0.025).toFixed(4)), upper: parseFloat(percentile(sortedTL, 0.975).toFixed(4)) };
  const ci95Ra   = { lower: parseFloat(percentile(sortedRa, 0.025).toFixed(4)), upper: parseFloat(percentile(sortedRa, 0.975).toFixed(4)) };
  const ci95Cost = { lower: parseFloat(percentile(sortedCost, 0.025).toFixed(4)), upper: parseFloat(percentile(sortedCost, 0.975).toFixed(4)) };

  const tool_life_weibull = fitWeibull(sortedTL);

  // Cpk: upper spec limit for Ra = tolerance / 4 (heuristic: 4× tolerance → Ra spec)
  const raUSL = feature.tolerance_mm * 1000 / 4; // tolerance mm → µm, divide by 4
  const Cpk_predicted = computeCpk(sortedRa, raUSL);

  const score = computeScore(cycle_time_min, tool_life_min, Ra_um, cost_per_part, refs);

  return {
    strategy_id: strategyId,
    cycle_time_min,
    cycle_time_ci95: ci95CT,
    tool_life_min,
    tool_life_weibull,
    Ra_um,
    Ra_ci95: ci95Ra,
    Cpk_predicted,
    cost_per_part,
    cost_ci95: ci95Cost,
    score,
  };
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StrategyBenchmarkEngine {
  private readonly DEFAULT_TRIALS = 500;

  /**
   * Benchmark a single strategy: runs 500-trial MC and returns full result.
   */
  benchmark(
    strategy: BenchmarkStrategy,
    feature: BenchmarkFeature,
    material: BenchmarkMaterial,
    tool: BenchmarkTool,
    machine: BenchmarkMachine,
    trials = this.DEFAULT_TRIALS,
  ): StrategyBenchmarkResult {
    const samples = runMCTrials(strategy, feature, material, tool, machine, trials);
    const meanOf = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

    // For single benchmark, use 2× mean values as scoring references
    const refs = {
      maxCycle:    meanOf(samples.cycleTime) * 2,
      minToolLife: meanOf(samples.toolLife) * 0.5,
      maxRa:       meanOf(samples.Ra) * 2,
      maxCost:     meanOf(samples.cost) * 2,
    };

    return summariseMC(strategy.strategy_id, samples, feature, refs);
  }

  /**
   * Compare multiple strategies: runs MC for each, returns ranked array.
   */
  compareBenchmarks(
    strategies: BenchmarkStrategy[],
    feature: BenchmarkFeature,
    material: BenchmarkMaterial,
    tool: BenchmarkTool,
    machine: BenchmarkMachine,
    trials = this.DEFAULT_TRIALS,
  ): RankedBenchmark[] {
    if (strategies.length === 0) return [];

    // Run MC for all strategies first so we can compute global refs
    const allSamples = strategies.map(s =>
      ({ id: s.strategy_id, samples: runMCTrials(s, feature, material, tool, machine, trials) })
    );

    const meanOf = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

    const refs = {
      maxCycle:    Math.max(...allSamples.map(a => meanOf(a.samples.cycleTime))),
      minToolLife: Math.min(...allSamples.map(a => meanOf(a.samples.toolLife))),
      maxRa:       Math.max(...allSamples.map(a => meanOf(a.samples.Ra))),
      maxCost:     Math.max(...allSamples.map(a => meanOf(a.samples.cost))),
    };

    const results: StrategyBenchmarkResult[] = allSamples.map(({ id, samples }) =>
      summariseMC(id, samples, feature, refs)
    );

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);
    const bestScore = results[0].score;

    return results.map((result, idx) => ({
      rank: idx + 1,
      result,
      delta_vs_best_pct: parseFloat(
        (bestScore > 0 ? ((bestScore - result.score) / bestScore) * 100 : 0).toFixed(2)
      ),
    }));
  }

  /**
   * Full stochastic analysis for a single strategy.
   * Returns result + raw sample distributions for custom post-processing.
   */
  monteCarloBenchmark(
    strategy: BenchmarkStrategy,
    feature: BenchmarkFeature,
    material: BenchmarkMaterial,
    tool: BenchmarkTool,
    machine: BenchmarkMachine,
    trials = this.DEFAULT_TRIALS,
  ): MonteCarloDetail {
    const samples = runMCTrials(strategy, feature, material, tool, machine, trials);
    const meanOf = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

    const refs = {
      maxCycle:    meanOf(samples.cycleTime) * 2,
      minToolLife: meanOf(samples.toolLife) * 0.5,
      maxRa:       meanOf(samples.Ra) * 2,
      maxCost:     meanOf(samples.cost) * 2,
    };

    const result = summariseMC(strategy.strategy_id, samples, feature, refs);

    return {
      result,
      cycle_time_samples: samples.cycleTime,
      tool_life_samples:  samples.toolLife,
      Ra_samples:         samples.Ra,
      cost_samples:       samples.cost,
      trials,
    };
  }
}

export const strategyBenchmarkEngine = new StrategyBenchmarkEngine();
export { StrategyBenchmarkEngine };
