/**
 * StochasticThermalEngine — Stochastic thermal prediction with convection
 * uncertainty and thermal property scatter for metal cutting processes.
 *
 * Physics: Jaeger moving heat source model with Kienzle cutting force,
 * Loewen-Shaw heat partition, and full distributional treatment of
 * material properties, convection coefficients, and heat partition ratio.
 *
 * Methods: Monte Carlo with Latin Hypercube Sampling (LHS), First-Order
 * Second-Moment (FOSM) analytical approximation, Sobol sensitivity indices.
 *
 * Coating risk: probability of exceeding coating temperature limits.
 */
import { log } from "../utils/Logger.js";

// ── Interfaces ──────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

export interface StochasticThermalInput {
  material: string;
  cutting_speed_mpm: number;
  feed_mm: number;
  depth_mm: number;
  width_mm?: number;
  tool_diameter_mm: number;
  coolant_type: "flood" | "mql" | "dry" | "cryogenic";
  coating?: "TiAlN" | "TiN" | "AlCrN" | "uncoated" | "diamond";
  coating_max_temp_c?: number;
  n_trials?: number;
  method?: "mc" | "fosm" | "both";
}

export interface StochasticThermalResult {
  mean_temp_c: number;
  std_dev_c: number;
  ci_95: [number, number];
  ci_99: [number, number];
  cv_percent: number;
  p_exceed_coating: {
    coating: string; max_temp_c: number;
    probability: number; risk: "safe" | "caution" | "danger";
  }[];
  sobol_indices: { parameter: string; Si: number; STi: number }[];
  fosm: { mean: number; std_dev: number } | null;
  mc: {
    mean: number; std_dev: number;
    histogram: { bin_center: number; count: number }[];
  } | null;
  dominant_uncertainty: string;
  heat_partition: { mean: number; std_dev: number; peclet: number };
  coolant_effectiveness: {
    h_mean: number; h_std: number; temp_reduction_pct: number;
  };
}

// ── Material thermal property database ──────────────────────────────

interface MaterialProps {
  k_wm_k: { mean: number; cv: number };
  cp_jkg_k: { mean: number; cv: number };
  density_kgm3: { mean: number; cv: number };
  kc1_1_mpa: { mean: number; cv: number };
  mc: { mean: number; cv: number };
}

const MATERIAL_DB: Record<string, MaterialProps> = {
  "Ti-6Al-4V": {
    k_wm_k: { mean: 6.7, cv: 0.08 }, cp_jkg_k: { mean: 526, cv: 0.05 },
    density_kgm3: { mean: 4430, cv: 0.01 }, kc1_1_mpa: { mean: 1680, cv: 0.10 },
    mc: { mean: 0.23, cv: 0.12 },
  },
  "AISI 4140": {
    k_wm_k: { mean: 42.6, cv: 0.06 }, cp_jkg_k: { mean: 473, cv: 0.04 },
    density_kgm3: { mean: 7850, cv: 0.01 }, kc1_1_mpa: { mean: 1500, cv: 0.08 },
    mc: { mean: 0.26, cv: 0.10 },
  },
  "Al 7075-T6": {
    k_wm_k: { mean: 130, cv: 0.05 }, cp_jkg_k: { mean: 960, cv: 0.04 },
    density_kgm3: { mean: 2810, cv: 0.01 }, kc1_1_mpa: { mean: 700, cv: 0.07 },
    mc: { mean: 0.30, cv: 0.10 },
  },
  "Inconel 718": {
    k_wm_k: { mean: 11.4, cv: 0.09 }, cp_jkg_k: { mean: 435, cv: 0.06 },
    density_kgm3: { mean: 8190, cv: 0.01 }, kc1_1_mpa: { mean: 2200, cv: 0.12 },
    mc: { mean: 0.25, cv: 0.15 },
  },
  "AISI 316L": {
    k_wm_k: { mean: 16.3, cv: 0.07 }, cp_jkg_k: { mean: 500, cv: 0.05 },
    density_kgm3: { mean: 7990, cv: 0.01 }, kc1_1_mpa: { mean: 1800, cv: 0.09 },
    mc: { mean: 0.24, cv: 0.11 },
  },
};

// ── Convection distributions (LogNormal params) ─────────────────────

const CONVECTION_DB: Record<string, { mu: number; sigma: number }> = {
  flood:     { mu: 6.9, sigma: 0.5 },
  mql:       { mu: 4.6, sigma: 0.4 },
  dry:       { mu: 2.7, sigma: 0.3 },
  cryogenic: { mu: 7.6, sigma: 0.4 },
};

// ── Coating temperature limits ──────────────────────────────────────

const COATING_LIMITS: Record<string, number> = {
  TiAlN: 900, TiN: 600, AlCrN: 1100, uncoated: 400, diamond: 700,
};

// ── Pseudo-random with seed (xorshift128) ───────────────────────────

class SeededRNG {
  private s: Uint32Array;
  constructor(seed = 42) {
    this.s = new Uint32Array(4);
    this.s[0] = seed >>> 0; this.s[1] = (seed * 2654435761) >>> 0;
    this.s[2] = (seed * 2246822519) >>> 0; this.s[3] = (seed * 3266489917) >>> 0;
    for (let i = 0; i < 20; i++) this.next();
  }
  next(): number {
    const s = this.s;
    let t = s[3]; t ^= t << 11; t ^= t >>> 8;
    s[3] = s[2]; s[2] = s[1]; s[1] = s[0];
    const s0 = s[0]; t ^= s0; t ^= s0 >>> 19;
    s[0] = t >>> 0;
    return (t >>> 0) / 4294967296;
  }
  /** Box-Muller standard normal */
  normal(): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  /** LogNormal sample */
  lognormal(mu: number, sigma: number): number {
    return Math.exp(mu + sigma * this.normal());
  }
  /** Beta distribution via Joehnk/Cheng method */
  beta(a: number, b: number): number {
    if (a <= 0 || b <= 0) return 0.5;
    const ga = this.gamma(a);
    const gb = this.gamma(b);
    return ga / (ga + gb);
  }
  /** Gamma via Marsaglia-Tsang */
  gamma(shape: number): number {
    if (shape < 1) {
      const u = this.next();
      return this.gamma(shape + 1) * Math.pow(u, 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    const MAX_ITER = 10_000;
    for (let _iter = 0; _iter < MAX_ITER; _iter++) {
      let x: number, v: number;
      do { x = this.normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = this.next();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
    return d; // fallback after MAX_ITER
  }
}

// ── Latin Hypercube Sampling ────────────────────────────────────────

function lhsShuffle(n: number, dims: number, rng: SeededRNG): number[][] {
  const samples: number[][] = [];
  for (let d = 0; d < dims; d++) {
    const perm: number[] = Array.from({ length: n }, (_, i) => i);
    // Fisher-Yates
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < n; i++) {
      if (!samples[i]) samples[i] = new Array(dims);
      samples[i][d] = (perm[i] + rng.next()) / n; // uniform [0,1] stratified
    }
  }
  return samples;
}

// ── Inverse CDF helpers ─────────────────────────────────────────────

function invNormalCDF(p: number): number {
  // Rational approximation (Abramowitz & Stegun 26.2.23)
  if (p <= 0) return -6; if (p >= 1) return 6;
  if (p < 0.5) return -invNormalCDF(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

function invLogNormalCDF(p: number, mu: number, sigma: number): number {
  return Math.exp(mu + sigma * invNormalCDF(p));
}

function normalSampleFromUniform(u: number, mean: number, std: number): number {
  return mean + std * invNormalCDF(u);
}

// ── Stats helpers ───────────────────────────────────────────────────

function mean(arr: number[]): number {
  let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function std(arr: number[], m?: number): number {
  const mu = m ?? mean(arr);
  let s = 0; for (let i = 0; i < arr.length; i++) { const d = arr[i] - mu; s += d * d; }
  return Math.sqrt(s / (arr.length - 1));
}

function quantile(sorted: number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

function histogram(arr: number[], nBins: number): { bin_center: number; count: number }[] {
  const mn = arr[0], mx = arr[arr.length - 1];
  const w = (mx - mn) / nBins || 1;
  const bins: { bin_center: number; count: number }[] = [];
  for (let i = 0; i < nBins; i++) bins.push({ bin_center: mn + w * (i + 0.5), count: 0 });
  for (const v of arr) {
    let idx = Math.floor((v - mn) / w);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

// ── Engine ──────────────────────────────────────────────────────────

/**
 * StochasticThermalEngine — Monte Carlo + FOSM stochastic thermal
 * prediction for metal cutting with convection uncertainty, thermal
 * property scatter, Kienzle force model, and Jaeger heat source theory.
 *
 * Produces temperature distributions, Sobol sensitivity indices,
 * coating exceedance probabilities, and coolant effectiveness metrics.
 */
class StochasticThermalEngine {

  /**
   * Compute stochastic thermal prediction.
   * @param input  Cutting conditions, material, coolant, and simulation settings.
   * @returns AtomicValue wrapping StochasticThermalResult with full uncertainty breakdown.
   */
  compute(input: StochasticThermalInput): AtomicValue<StochasticThermalResult> {
    const mat = this.resolveMaterial(input.material);
    const coating = input.coating ?? "TiAlN";
    const MAX_TRIALS = 100_000;
    const nTrials = Math.min(input.n_trials ?? 2000, MAX_TRIALS);
    const method = input.method ?? "both";
    const width = input.width_mm ?? input.tool_diameter_mm;

    // ── Nominal Peclet number for heat partition ──
    const alpha_wp_nom = mat.k_wm_k.mean / (mat.density_kgm3.mean * mat.cp_jkg_k.mean);
    const V_ms = input.cutting_speed_mpm / 60;
    const a_chip = input.feed_mm / 1000; // uncut chip thickness in m
    const Pe_nom = (V_ms * a_chip) / (4 * alpha_wp_nom);

    // ── MC simulation ──
    let mcResult: StochasticThermalResult["mc"] = null;
    let temps: number[] = [];
    let sobolData: { parameter: string; Si: number; STi: number }[] = [];
    let partitionSamples: number[] = [];
    let hSamples: number[] = [];

    if (method === "mc" || method === "both") {
      const mc = this.runMonteCarlo(input, mat, nTrials, Pe_nom);
      temps = mc.temps;
      partitionSamples = mc.partitions;
      hSamples = mc.hValues;
      sobolData = mc.sobol;

      const sorted = [...temps].sort((a, b) => a - b);
      const m = mean(temps);
      const s = std(temps, m);
      mcResult = {
        mean: round(m, 1),
        std_dev: round(s, 1),
        histogram: histogram(sorted, 30),
      };
    }

    // ── FOSM ──
    let fosmResult: StochasticThermalResult["fosm"] = null;
    if (method === "fosm" || method === "both") {
      fosmResult = this.runFOSM(input, mat, Pe_nom);
    }

    // ── Combine results ──
    const useMC = mcResult !== null;
    const bestMean = useMC ? mcResult!.mean : fosmResult!.mean;
    const bestStd = useMC ? mcResult!.std_dev : fosmResult!.std_dev;

    const sorted = useMC ? [...temps].sort((a, b) => a - b) : [];
    const ci95: [number, number] = useMC
      ? [round(quantile(sorted, 0.025), 1), round(quantile(sorted, 0.975), 1)]
      : [round(bestMean - 1.96 * bestStd, 1), round(bestMean + 1.96 * bestStd, 1)];
    const ci99: [number, number] = useMC
      ? [round(quantile(sorted, 0.005), 1), round(quantile(sorted, 0.995), 1)]
      : [round(bestMean - 2.576 * bestStd, 1), round(bestMean + 2.576 * bestStd, 1)];

    // ── Coating exceedance ──
    const coatings = Object.entries(COATING_LIMITS);
    const pExceed = coatings.map(([c, maxT]) => {
      const overrideMax = (c === coating && input.coating_max_temp_c) ? input.coating_max_temp_c : maxT;
      let prob: number;
      if (useMC) {
        const nExceed = temps.filter(t => t > overrideMax).length;
        prob = nExceed / temps.length;
      } else {
        const z = (overrideMax - bestMean) / bestStd;
        prob = 1 - normalCDF(z);
      }
      const risk: "safe" | "caution" | "danger" = prob < 0.01 ? "safe" : prob < 0.10 ? "caution" : "danger";
      return { coating: c, max_temp_c: overrideMax, probability: round(prob, 4), risk };
    });

    // ── Heat partition stats ──
    const partMean = partitionSamples.length > 0 ? mean(partitionSamples) : this.nominalPartition(Pe_nom);
    const partStd = partitionSamples.length > 1 ? std(partitionSamples) : 0;

    // ── Coolant effectiveness ──
    const hMean = hSamples.length > 0 ? mean(hSamples) : this.nominalH(input.coolant_type);
    const hStd = hSamples.length > 1 ? std(hSamples) : 0;
    const dryH = Math.exp(CONVECTION_DB["dry"].mu + CONVECTION_DB["dry"].sigma ** 2 / 2);
    const coolH = hMean;
    const tempReductionPct = coolH > dryH ? round((1 - dryH / coolH) * 100, 1) : 0;

    // ── Dominant uncertainty ──
    const dominant = sobolData.length > 0
      ? sobolData.reduce((a, b) => b.STi > a.STi ? b : a).parameter
      : "convection_h";

    const cv = bestStd / bestMean * 100;

    const result: StochasticThermalResult = {
      mean_temp_c: round(bestMean, 1),
      std_dev_c: round(bestStd, 1),
      ci_95: ci95,
      ci_99: ci99,
      cv_percent: round(cv, 2),
      p_exceed_coating: pExceed,
      sobol_indices: sobolData,
      fosm: fosmResult,
      mc: mcResult,
      dominant_uncertainty: dominant,
      heat_partition: {
        mean: round(partMean, 4), std_dev: round(partStd, 4),
        peclet: round(Pe_nom, 3),
      },
      coolant_effectiveness: {
        h_mean: round(hMean, 1), h_std: round(hStd, 1),
        temp_reduction_pct: tempReductionPct,
      },
    };

    log.info(`StochasticThermal: ${input.material} Vc=${input.cutting_speed_mpm} T_mean=${result.mean_temp_c}°C ±${result.std_dev_c} [${method}]`);

    return {
      value: result,
      unit: "°C (distribution)",
      formula: "Jaeger moving heat source + Kienzle force + LHS Monte Carlo + FOSM",
      confidence: useMC ? Math.min(0.95, 1 - cv / 200) : 0.80,
    };
  }

  // ── Monte Carlo core ──────────────────────────────────────────────

  private runMonteCarlo(
    input: StochasticThermalInput, mat: MaterialProps, n: number, Pe_nom: number,
  ): {
    temps: number[]; partitions: number[]; hValues: number[];
    sobol: { parameter: string; Si: number; STi: number }[];
  } {

    const rng = new SeededRNG(12345);
    const dims = 6; // k, cp, h, R_chip, kc1_1, mc
    const lhs = lhsShuffle(n, dims, rng);

    const V_ms = input.cutting_speed_mpm / 60;
    const a_chip = input.feed_mm / 1000;
    const depth_m = input.depth_mm / 1000;
    const width_m = (input.width_mm ?? input.tool_diameter_mm) / 1000;
    const conv = CONVECTION_DB[input.coolant_type];

    // Beta params for heat partition
    const { alpha: betaA, beta: betaB } = this.partitionBetaParams(Pe_nom);

    const temps: number[] = new Array(n);
    const partitions: number[] = new Array(n);
    const hValues: number[] = new Array(n);

    // Store per-parameter sample arrays for Sobol
    const paramSamples: number[][] = Array.from({ length: dims }, () => new Array(n));

    const rng2 = new SeededRNG(67890);

    for (let i = 0; i < n; i++) {
      const u = lhs[i];

      // Sample from marginal distributions via inverse CDF / LHS
      const k_wp = normalSampleFromUniform(u[0], mat.k_wm_k.mean, mat.k_wm_k.mean * mat.k_wm_k.cv);
      const cp_wp = normalSampleFromUniform(u[1], mat.cp_jkg_k.mean, mat.cp_jkg_k.mean * mat.cp_jkg_k.cv);
      const h = invLogNormalCDF(u[2], conv.mu, conv.sigma);
      const R_chip = rng2.beta(betaA, betaB); // beta via RNG (hard to invert analytically)
      const kc11 = normalSampleFromUniform(u[4], mat.kc1_1_mpa.mean, mat.kc1_1_mpa.mean * mat.kc1_1_mpa.cv);
      const mc_val = normalSampleFromUniform(u[5], mat.mc.mean, mat.mc.mean * mat.mc.cv);

      paramSamples[0][i] = k_wp;
      paramSamples[1][i] = cp_wp;
      paramSamples[2][i] = h;
      paramSamples[3][i] = R_chip;
      paramSamples[4][i] = kc11;
      paramSamples[5][i] = mc_val;

      // Kienzle cutting force
      const h_chip = Math.max(a_chip, 1e-6);
      const Fc = kc11 * depth_m * 1000 * Math.pow(h_chip * 1000, 1 - mc_val); // N (Kienzle: kc1.1 * b * h^(1-mc))

      // Heat flux into tool
      const L_contact = a_chip * 2; // simplified contact length ≈ 2× chip thickness
      const A_contact = L_contact * depth_m;
      const q_tool = Math.max(0, (1 - R_chip) * Fc * V_ms / Math.max(A_contact, 1e-12));

      // Workpiece diffusivity
      const rho_wp = mat.density_kgm3.mean;
      const alpha_wp = Math.max(k_wp / (rho_wp * Math.max(cp_wp, 1)), 1e-10);

      // Peclet number for this trial
      const Pe = (V_ms * a_chip) / (4 * alpha_wp);

      // Jaeger f(Pe) — Loewen-Shaw approximation
      const fPe = Pe < 0.5 ? 1.0 / (1 + 2 * Pe) : 0.754 / Math.sqrt(Pe);

      // Tool thermal conductivity (carbide/coated ~50 W/mK)
      const k_tool = 50;

      // Jaeger: θ_max = (q · L) / (k_tool · π) · f(Pe)
      const theta_source = (q_tool * L_contact) / (k_tool * Math.PI) * fPe;

      // Convective cooling reduction factor
      const Bi = h * L_contact / k_wp; // Biot-like number
      const coolFactor = 1 / (1 + 0.5 * Bi);

      // Final temperature above ambient
      const T_rise = theta_source * coolFactor;
      const T_final = 25 + Math.max(T_rise, 0); // ambient = 25°C

      temps[i] = T_final;
      partitions[i] = R_chip;
      hValues[i] = h;
    }

    // ── Sobol first-order indices (correlation-based estimator) ──
    const paramNames = [
      "k_thermal", "cp_specific_heat", "convection_h",
      "heat_partition_R", "kc1_1", "mc_exponent",
    ];
    const tMean = mean(temps);
    const tVar = variance(temps, tMean);
    const sobol = paramNames.map((name, d) => {
      const Si = tVar > 0 ? Math.abs(correlation(paramSamples[d], temps)) ** 2 : 0;
      // Total index approximation: Si + interaction ≈ Si * 1.1 (simplified)
      const STi = Math.min(Si * 1.15, 1.0);
      return { parameter: name, Si: round(Si, 4), STi: round(STi, 4) };
    });

    // Normalize so sum(Si) ≤ 1
    const sumSi = sobol.reduce((s, v) => s + v.Si, 0);
    if (sumSi > 1) {
      for (const s of sobol) {
        s.Si = round(s.Si / sumSi, 4);
        s.STi = round(s.STi / sumSi, 4);
      }
    }

    return { temps, partitions, hValues, sobol };
  }

  // ── FOSM analytical ───────────────────────────────────────────────

  private runFOSM(
    input: StochasticThermalInput, mat: MaterialProps, Pe_nom: number,
  ): { mean: number; std_dev: number } {

    const V_ms = input.cutting_speed_mpm / 60;
    const a_chip = input.feed_mm / 1000;
    const depth_m = input.depth_mm / 1000;
    const conv = CONVECTION_DB[input.coolant_type];

    // Nominal values
    const k_nom = mat.k_wm_k.mean;
    const cp_nom = mat.cp_jkg_k.mean;
    const rho_nom = mat.density_kgm3.mean;
    const kc11_nom = mat.kc1_1_mpa.mean;
    const mc_nom = mat.mc.mean;
    const h_nom = Math.exp(conv.mu + conv.sigma ** 2 / 2);
    const R_nom = this.nominalPartition(Pe_nom);

    // Nominal temperature
    const T_nom = this.deterministicTemp(V_ms, a_chip, depth_m, k_nom, cp_nom, rho_nom, kc11_nom, mc_nom, h_nom, R_nom);

    // Finite difference partial derivatives
    const dk = k_nom * mat.k_wm_k.cv;
    const dcp = cp_nom * mat.cp_jkg_k.cv;
    const dkc = kc11_nom * mat.kc1_1_mpa.cv;
    const dmc = mc_nom * mat.mc.cv;
    const dh = h_nom * conv.sigma; // approximate std from lognormal
    const dR = 0.05; // approximate std of heat partition

    const delta = 0.001;
    const fd = (p: "k" | "cp" | "h" | "R" | "kc" | "mc") =>
      this.fdPartial(
        V_ms, a_chip, depth_m, k_nom, cp_nom, rho_nom,
        kc11_nom, mc_nom, h_nom, R_nom, p, delta,
      );
    const partials: { dTdx: number; sigma_x: number }[] = [
      { dTdx: fd("k"), sigma_x: dk },
      { dTdx: fd("cp"), sigma_x: dcp },
      { dTdx: fd("h"), sigma_x: dh },
      { dTdx: fd("R"), sigma_x: dR },
      { dTdx: fd("kc"), sigma_x: dkc },
      { dTdx: fd("mc"), sigma_x: dmc },
    ];

    const varT = partials.reduce((s, p) => s + (p.dTdx * p.sigma_x) ** 2, 0);
    return { mean: round(T_nom, 1), std_dev: round(Math.sqrt(varT), 1) };
  }

  // ── Deterministic Jaeger model ────────────────────────────────────

  private deterministicTemp(
    V: number, a: number, b: number,
    k_wp: number, cp_wp: number, rho_wp: number,
    kc11: number, mc: number, h: number, R_chip: number,
  ): number {
    const h_chip = Math.max(a, 1e-6);
    const Fc = kc11 * b * 1000 * Math.pow(h_chip * 1000, 1 - mc);
    const L_contact = a * 2;
    const A_contact = L_contact * b;
    const q_tool = (1 - R_chip) * Fc * V / Math.max(A_contact, 1e-12);
    const alpha_wp = k_wp / (rho_wp * cp_wp);
    const Pe = (V * a) / (4 * alpha_wp);
    const fPe = Pe < 0.5 ? 1 / (1 + 2 * Pe) : 0.754 / Math.sqrt(Pe);
    const k_tool = 50;
    const theta = (q_tool * L_contact) / (k_tool * Math.PI) * fPe;
    const Bi = h * L_contact / k_wp;
    const coolFactor = 1 / (1 + 0.5 * Bi);
    return 25 + Math.max(theta * coolFactor, 0);
  }

  // ── Finite difference partial ─────────────────────────────────────

  private fdPartial(
    V: number, a: number, b: number,
    k: number, cp: number, rho: number, kc: number, mc: number, h: number, R: number,
    param: "k" | "cp" | "h" | "R" | "kc" | "mc", delta: number,
  ): number {
    const eps = delta;
    const perturb = (mult: number): number => {
      const kp = param === "k" ? k * (1 + mult * eps) : k;
      const cpp = param === "cp" ? cp * (1 + mult * eps) : cp;
      const hp = param === "h" ? h * (1 + mult * eps) : h;
      const Rp = param === "R" ? Math.min(Math.max(R + mult * eps * 0.05, 0.01), 0.99) : R;
      const kcp = param === "kc" ? kc * (1 + mult * eps) : kc;
      const mcp = param === "mc" ? mc * (1 + mult * eps) : mc;
      return this.deterministicTemp(V, a, b, kp, cpp, rho, kcp, mcp, hp, Rp);
    };
    const T_plus = perturb(1);
    const T_minus = perturb(-1);
    const paramVal = param === "k" ? k : param === "cp" ? cp : param === "h" ? h
      : param === "R" ? 0.05 : param === "kc" ? kc : mc;
    const dParam = param === "R" ? 2 * eps * 0.05 : 2 * eps * paramVal;
    return dParam !== 0 ? (T_plus - T_minus) / dParam : 0;
  }

  // ── Heat partition helpers ────────────────────────────────────────

  private partitionBetaParams(Pe: number): { alpha: number; beta: number } {
    if (Pe > 10) return { alpha: 8, beta: 3 };
    if (Pe < 2) return { alpha: 4, beta: 6 };
    // Linear interpolation
    const t = (Pe - 2) / 8;
    return { alpha: 4 + 4 * t, beta: 6 - 3 * t };
  }

  private nominalPartition(Pe: number): number {
    const p = this.partitionBetaParams(Pe);
    return p.alpha / (p.alpha + p.beta);
  }

  private nominalH(coolant: string): number {
    const c = CONVECTION_DB[coolant] ?? CONVECTION_DB["dry"];
    return Math.exp(c.mu + c.sigma ** 2 / 2);
  }

  // ── Material resolver ─────────────────────────────────────────────

  private resolveMaterial(name: string): MaterialProps {
    // Exact match
    if (MATERIAL_DB[name]) return MATERIAL_DB[name];
    // Case-insensitive partial
    const lower = name.toLowerCase();
    for (const [key, val] of Object.entries(MATERIAL_DB)) {
      if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val;
    }
    // Fallback: AISI 4140
    log.warn(`StochasticThermal: unknown material "${name}", defaulting to AISI 4140`);
    return MATERIAL_DB["AISI 4140"];
  }
}

// ── Utility functions ───────────────────────────────────────────────

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function variance(arr: number[], m?: number): number {
  const mu = m ?? mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) { const d = arr[i] - mu; s += d * d; }
  return s / (arr.length - 1);
}

function correlation(x: number[], y: number[]): number {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom > 0 ? num / denom : 0;
}

function normalCDF(z: number): number {
  // Horner approximation (Abramowitz & Stegun 26.2.17)
  if (z < -8) return 0;
  if (z > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

// ── Export ───────────────────────────────────────────────────────────

export const stochasticThermalEngine = new StochasticThermalEngine();
export { StochasticThermalEngine };
