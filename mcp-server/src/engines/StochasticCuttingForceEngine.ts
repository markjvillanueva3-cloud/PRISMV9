/**
 * StochasticCuttingForceEngine — Monte Carlo uncertainty propagation for cutting forces
 *
 * Combines Kienzle force model with stochastic material property scatter,
 * tool geometry tolerance, and runout to produce force distributions with
 * confidence intervals and sensitivity analysis.
 *
 * Methods:
 *   - Monte Carlo with Latin Hypercube Sampling (LHS)
 *   - FOSM (First-Order Second Moment) analytical linearization
 *   - Sobol sensitivity indices (Saltelli's scheme)
 *
 * References:
 *   Kienzle & Victor (1957) specific cutting force model,
 *   Saltelli et al. (2010) "Variance based sensitivity analysis",
 *   Haldar & Mahadevan "Probability, Reliability and Statistical Methods" Ch. 14 FOSM,
 *   Altintas "Manufacturing Automation" Ch. 2 (cutting mechanics),
 *   Arrazola et al. (2013) "Recent advances in modelling of metal machining processes"
 */

// ─── Types ─────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

export interface StochasticForceInput {
  material: string;
  depth_mm: number;
  feed_mm: number;
  width_mm?: number;
  tool_diameter_mm: number;
  flute_count: number;
  rake_angle_deg?: number;
  edge_radius_um?: number;
  runout_um?: number;
  n_trials?: number;
  method?: "mc" | "fosm" | "both";
  overrides?: Partial<MaterialScatter>;
}

export interface MaterialScatter {
  kc1_1_mean: number;
  kc1_1_cv: number;
  mc_mean: number;
  mc_cv: number;
  yield_mpa_mean: number;
  yield_mpa_cv: number;
  friction_angle_deg_mean: number;
  friction_angle_deg_cv: number;
}

export interface HistogramBin {
  bin_center: number;
  count: number;
}

export interface SobolIndex {
  parameter: string;
  Si: number;
  STi: number;
}

export interface ExceedanceProbability {
  limit_n: number;
  probability: number;
}

export interface StochasticForceResult {
  mean_force_n: number;
  std_dev_n: number;
  ci_95: [number, number];
  ci_99: [number, number];
  cv_percent: number;
  p_exceed: ExceedanceProbability[];
  sobol_indices: SobolIndex[];
  fosm: { mean: number; std_dev: number } | null;
  mc: { mean: number; std_dev: number; histogram: HistogramBin[] } | null;
  dominant_uncertainty: string;
  material_scatter: { parameter: string; mean: number; cv_pct: number }[];
  /** True when `material` matched a scatter-DB entry; false when the engine fell
   *  back to default (AISI 4140) scatter for an unrecognized material. */
  material_matched: boolean;
  /** Fail-loud advisories (e.g. unmatched material → default-scatter fallback). */
  warnings: string[];
}

// ─── Material Scatter Database ─────────────────────────────────────
// Published values from Kienzle tables, ASM handbooks, and machining data references.
// CV% sourced from Arrazola (2013), König & Klocke, Shaw "Metal Cutting Principles".

interface MaterialEntry {
  kc1_1: { mean: number; cv: number };   // N/mm², CV as fraction
  mc:    { mean: number; cv: number };   // Kienzle exponent
  yield_mpa: { mean: number; cv: number };
  friction_angle_deg: { mean: number; cv: number };
}

const MATERIAL_DB: Record<string, MaterialEntry> = {
  "Ti-6Al-4V": {
    kc1_1: { mean: 1680, cv: 0.08 },    // High scatter, alpha-beta microstructure sensitive
    mc:    { mean: 0.23, cv: 0.10 },
    yield_mpa: { mean: 880, cv: 0.05 },
    friction_angle_deg: { mean: 38, cv: 0.08 },
  },
  "AISI 4140": {
    kc1_1: { mean: 1820, cv: 0.06 },
    mc:    { mean: 0.26, cv: 0.07 },
    yield_mpa: { mean: 655, cv: 0.04 },
    friction_angle_deg: { mean: 32, cv: 0.06 },
  },
  "Al 7075-T6": {
    kc1_1: { mean: 790, cv: 0.05 },     // Aluminum: lower scatter
    mc:    { mean: 0.23, cv: 0.06 },
    yield_mpa: { mean: 503, cv: 0.03 },
    friction_angle_deg: { mean: 28, cv: 0.05 },
  },
  "Inconel 718": {
    kc1_1: { mean: 2650, cv: 0.10 },    // Nickel superalloy: highest scatter
    mc:    { mean: 0.25, cv: 0.12 },
    yield_mpa: { mean: 1035, cv: 0.06 },
    friction_angle_deg: { mean: 42, cv: 0.09 },
  },
  "AISI 316L": {
    kc1_1: { mean: 2100, cv: 0.07 },    // Austenitic stainless
    mc:    { mean: 0.25, cv: 0.08 },
    yield_mpa: { mean: 290, cv: 0.05 },
    friction_angle_deg: { mean: 35, cv: 0.07 },
  },
};

// ─── Deterministic Helpers ─────────────────────────────────────────

/** Pseudo-random number generator (Mulberry32) for reproducibility within engine. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: uniform → standard normal. */
function boxMuller(u1: number, u2: number): [number, number] {
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

/** Latin Hypercube Sampling: returns n_samples × n_dims matrix of U(0,1) stratified samples. */
function latinHypercube(nSamples: number, nDims: number, rng: () => number): number[][] {
  const result: number[][] = Array.from({ length: nSamples }, () => new Array(nDims));
  for (let d = 0; d < nDims; d++) {
    // Create permutation of strata
    const perm = Array.from({ length: nSamples }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = nSamples - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < nSamples; i++) {
      result[i][d] = (perm[i] + rng()) / nSamples;
    }
  }
  return result;
}

/** Inverse normal CDF (Beasley-Springer-Moro algorithm). */
function normalInv(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0,  2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0,  3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Compute Kienzle cutting force with geometry corrections. */
function kienzleForce(
  kc1_1: number, mc: number, ap: number, fz: number,
  ae_ratio: number, rake_deg: number, rake_nom: number,
  edge_radius_um: number, runout_um: number,
): number {
  // Base Kienzle: Fc = kc1_1 * ap * fz^(1-mc)
  // ae_factor approximates radial engagement effect (simplified for slot = 1.0)
  const ae_factor = Math.sqrt(ae_ratio); // Geometric mean engagement scaling
  let Fc = kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mc) * ae_factor;

  // Rake angle correction (Merchant / Shaw): ~1% per degree deviation
  Fc *= (1 - 0.01 * (rake_deg - rake_nom));

  // Edge radius size effect (Albrecht): significant at low feeds
  Fc *= (1 + edge_radius_um / (1000 * Math.max(fz, 0.001)));

  // Runout effect: increases effective chip load on most-loaded tooth
  const runout_mm = runout_um / 1000;
  Fc *= (1 + runout_mm / Math.max(fz, 0.001));

  return Math.max(Fc, 0);
}

// ─── Engine Class ──────────────────────────────────────────────────

/**
 * StochasticCuttingForceEngine — Propagates material property scatter and
 * tool geometry tolerances through the Kienzle cutting force model using
 * Monte Carlo (LHS) simulation, FOSM analytical linearization, and Sobol
 * variance-based sensitivity analysis.
 *
 * Supports 5+ materials with published scatter data. All math is self-contained.
 */
export class StochasticCuttingForceEngine {

  /**
   * Resolve material scatter from DB, applying overrides.
   *
   * Returns `matched:false` when `material` is not in MATERIAL_DB and the engine
   * falls back to default (AISI 4140) scatter. The caller (`compute`) surfaces the
   * miss as a warning + reduced confidence per R12 fail-loud — mirrors the
   * LatheSpeedFeed facade fix; do NOT add a second ad-hoc default here.
   */
  private resolveScatter(
    material: string,
    overrides?: Partial<MaterialScatter>,
  ): { scatter: MaterialScatter; matched: boolean } {
    const key = Object.keys(MATERIAL_DB).find(
      k => k.toLowerCase() === material.toLowerCase()
    );
    const matched = key !== undefined;
    // Fallback base = AISI 4140 (mid-range steel scatter) so compute() still yields
    // a finite distribution — but `matched:false` forces the caller to flag it.
    const entry = key ? MATERIAL_DB[key] : MATERIAL_DB["AISI 4140"];

    const scatter: MaterialScatter = {
      kc1_1_mean: entry.kc1_1.mean,
      kc1_1_cv: entry.kc1_1.cv,
      mc_mean: entry.mc.mean,
      mc_cv: entry.mc.cv,
      yield_mpa_mean: entry.yield_mpa.mean,
      yield_mpa_cv: entry.yield_mpa.cv,
      friction_angle_deg_mean: entry.friction_angle_deg.mean,
      friction_angle_deg_cv: entry.friction_angle_deg.cv,
    };

    if (overrides) {
      Object.assign(scatter, overrides);
    }
    return { scatter, matched };
  }

  /** Run Monte Carlo with LHS. Returns force array. */
  private runMC(
    scatter: MaterialScatter,
    ap: number, fz: number, ae_ratio: number,
    rake_nom: number, edge_nom_um: number, runout_nom_um: number,
    nTrials: number,
  ): number[] {
    const rng = mulberry32(42);

    // 7 stochastic dimensions: kc1_1, mc, yield, friction_angle, rake, edge_radius, runout
    const nDims = 7;
    const lhs = latinHypercube(nTrials, nDims, rng);
    const forces: number[] = new Array(nTrials);

    for (let i = 0; i < nTrials; i++) {
      const u = lhs[i];

      // Transform uniform → normal for each parameter
      const kc   = scatter.kc1_1_mean * (1 + scatter.kc1_1_cv * normalInv(u[0]));
      const mc   = scatter.mc_mean * (1 + scatter.mc_cv * normalInv(u[1]));
      // yield and friction_angle contribute via secondary effects (not used in base Kienzle
      // but reserved for extended models)
      const rake = rake_nom + 0.5 * normalInv(u[4]);       // ±0.5° tolerance
      const edge = edge_nom_um + 5 * normalInv(u[5]);      // ±5 μm tolerance
      const rout = runout_nom_um + 3 * normalInv(u[6]);    // ±3 μm tolerance

      forces[i] = kienzleForce(
        Math.max(kc, 100), Math.max(mc, 0.05),
        ap, fz, ae_ratio,
        rake, rake_nom,
        Math.max(edge, 1), Math.max(rout, 0),
      );
    }

    return forces;
  }

  /** FOSM: linearize around mean, propagate variance analytically. */
  private runFOSM(
    scatter: MaterialScatter,
    ap: number, fz: number, ae_ratio: number,
    rake_nom: number, edge_nom_um: number, runout_nom_um: number,
  ): { mean: number; std_dev: number } {
    // Nominal force
    const f0 = kienzleForce(
      scatter.kc1_1_mean, scatter.mc_mean,
      ap, fz, ae_ratio, rake_nom, rake_nom, edge_nom_um, runout_nom_um,
    );

    // Parameters and their std devs
    const params: { name: string; nominal: number; sigma: number }[] = [
      { name: "kc1_1", nominal: scatter.kc1_1_mean, sigma: scatter.kc1_1_mean * scatter.kc1_1_cv },
      { name: "mc", nominal: scatter.mc_mean, sigma: scatter.mc_mean * scatter.mc_cv },
      { name: "rake_deg", nominal: rake_nom, sigma: 0.5 },
      { name: "edge_radius_um", nominal: edge_nom_um, sigma: 5 },
      { name: "runout_um", nominal: runout_nom_um, sigma: 3 },
    ];

    let variance = 0;

    for (const p of params) {
      const h = Math.max(p.sigma * 0.01, 1e-8); // step for central difference

      // Build arguments with +h and -h perturbation
      const evalAt = (delta: number): number => {
        let kc = scatter.kc1_1_mean;
        let mc = scatter.mc_mean;
        let rake = rake_nom;
        let edge = edge_nom_um;
        let rout = runout_nom_um;

        switch (p.name) {
          case "kc1_1": kc += delta; break;
          case "mc": mc += delta; break;
          case "rake_deg": rake += delta; break;
          case "edge_radius_um": edge += delta; break;
          case "runout_um": rout += delta; break;
        }

        return kienzleForce(kc, mc, ap, fz, ae_ratio, rake, rake_nom, edge, rout);
      };

      const dFdx = (evalAt(h) - evalAt(-h)) / (2 * h);
      variance += dFdx * dFdx * p.sigma * p.sigma;
    }

    return { mean: f0, std_dev: Math.sqrt(variance) };
  }

  /**
   * Sobol sensitivity indices via Saltelli's scheme.
   * Uses a base matrix A and complement matrix B, then computes
   * Si and STi for each input dimension.
   */
  private computeSobol(
    scatter: MaterialScatter,
    ap: number, fz: number, ae_ratio: number,
    rake_nom: number, edge_nom_um: number, runout_nom_um: number,
    nBase: number,
  ): SobolIndex[] {
    const rng = mulberry32(7919); // different seed from MC
    const nDims = 5; // kc1_1, mc, rake, edge, runout
    const paramNames = ["kc1_1", "mc", "rake_deg", "edge_radius_um", "runout_um"];

    // Generate base matrices A and B (nBase × nDims uniform samples)
    const A = latinHypercube(nBase, nDims, rng);
    const B = latinHypercube(nBase, nDims, rng);

    // Transform a single uniform sample row → force value
    const evalSample = (row: number[]): number => {
      const kc   = scatter.kc1_1_mean * (1 + scatter.kc1_1_cv * normalInv(row[0]));
      const mc   = scatter.mc_mean * (1 + scatter.mc_cv * normalInv(row[1]));
      const rake = rake_nom + 0.5 * normalInv(row[2]);
      const edge = edge_nom_um + 5 * normalInv(row[3]);
      const rout = runout_nom_um + 3 * normalInv(row[4]);
      return kienzleForce(
        Math.max(kc, 100), Math.max(mc, 0.05),
        ap, fz, ae_ratio, rake, rake_nom,
        Math.max(edge, 1), Math.max(rout, 0),
      );
    };

    // Evaluate f(A) and f(B)
    const fA = A.map(evalSample);
    const fB = B.map(evalSample);

    const f0 = fA.reduce((s, v) => s + v, 0) / nBase;
    const totalVar = fA.reduce((s, v) => s + (v - f0) * (v - f0), 0) / nBase;

    const indices: SobolIndex[] = [];

    for (let j = 0; j < nDims; j++) {
      // AB_j: A with column j replaced by B's column j
      const AB_j: number[][] = A.map((row, i) => {
        const r = [...row];
        r[j] = B[i][j];
        return r;
      });
      // BA_j: B with column j replaced by A's column j
      const BA_j: number[][] = B.map((row, i) => {
        const r = [...row];
        r[j] = A[i][j];
        return r;
      });

      const fABj = AB_j.map(evalSample);
      const fBAj = BA_j.map(evalSample);

      // First-order: Si = (1/N) * Σ fB[i] * (fABj[i] - fA[i]) / Var
      let numSi = 0;
      for (let i = 0; i < nBase; i++) {
        numSi += fB[i] * (fABj[i] - fA[i]);
      }
      const Si = Math.max(0, Math.min(1, numSi / (nBase * Math.max(totalVar, 1e-12))));

      // Total-order: STi = (1/2N) * Σ (fA[i] - fABj[i])^2 / Var
      let numSTi = 0;
      for (let i = 0; i < nBase; i++) {
        const diff = fA[i] - fABj[i];
        numSTi += diff * diff;
      }
      const STi = Math.max(0, Math.min(1, numSTi / (2 * nBase * Math.max(totalVar, 1e-12))));

      indices.push({ parameter: paramNames[j], Si: round4(Si), STi: round4(STi) });
    }

    return indices;
  }

  /** Build histogram from force samples. */
  private buildHistogram(forces: number[], nBins: number = 30): HistogramBin[] {
    const min = Math.min(...forces);
    const max = Math.max(...forces);
    const range = max - min || 1;
    const binWidth = range / nBins;
    const counts = new Array(nBins).fill(0);

    for (const f of forces) {
      const idx = Math.min(Math.floor((f - min) / binWidth), nBins - 1);
      counts[idx]++;
    }

    return counts.map((c, i) => ({
      bin_center: round2(min + (i + 0.5) * binWidth),
      count: c,
    }));
  }

  /** Compute exceedance probabilities for standard force limits. */
  private computeExceedance(forces: number[], mean: number): ExceedanceProbability[] {
    const sorted = [...forces].sort((a, b) => a - b);
    const n = sorted.length;

    // Test limits at 1.5×, 2×, 2.5×, 3× mean
    const multipliers = [1.5, 2.0, 2.5, 3.0];
    return multipliers.map(m => {
      const limit = round2(mean * m);
      const exceedCount = sorted.filter(f => f > limit).length;
      return { limit_n: limit, probability: round4(exceedCount / n) };
    });
  }

  /**
   * Compute stochastic cutting force prediction with full uncertainty quantification.
   *
   * @param input - Cutting parameters, material, and simulation settings
   * @returns AtomicValue wrapping StochasticForceResult with force distribution,
   *          confidence intervals, Sobol indices, and FOSM/MC comparison
   *
   * @example
   * ```ts
   * const result = stochasticCuttingForceEngine.compute({
   *   material: "Ti-6Al-4V",
   *   depth_mm: 2.0,
   *   feed_mm: 0.12,
   *   tool_diameter_mm: 12,
   *   flute_count: 4,
   * });
   * console.log(result.value.ci_95); // [650, 920]
   * console.log(result.value.dominant_uncertainty); // "kc1_1"
   * ```
   */
  compute(input: StochasticForceInput): AtomicValue<StochasticForceResult> {
    const {
      material,
      depth_mm: ap,
      feed_mm: fz,
      tool_diameter_mm: diam,
      flute_count,
      rake_angle_deg = 6,
      edge_radius_um = 25,
      runout_um = 5,
      n_trials: _n_trials = 2000,
      method = "both",
      overrides,
    } = input;

    const MAX_TRIALS = 100_000;
    const n_trials = Math.min(_n_trials, MAX_TRIALS);

    const width_mm = input.width_mm ?? diam;
    const ae_ratio = Math.min(width_mm / diam, 1.0);
    const { scatter, matched: material_matched } = this.resolveScatter(material, overrides);

    // ── Fail-loud on unmatched material (R12) ──
    // An unrecognized material silently borrowed AISI 4140 scatter yet still
    // reported ~0.95 confidence. Surface the miss so downstream safety gates never
    // trust a fallback distribution as if it were material-specific.
    const warnings: string[] = [];
    if (!material_matched) {
      warnings.push(
        `Material "${material}" not found in scatter DB ` +
        `[${Object.keys(MATERIAL_DB).join(", ")}]; using "AISI 4140" scatter as a ` +
        `conservative fallback — force distribution is indicative only, not material-specific.`
      );
    }

    // ── Monte Carlo ──
    let mcResult: StochasticForceResult["mc"] = null;
    let mcForces: number[] = [];

    if (method === "mc" || method === "both") {
      mcForces = this.runMC(scatter, ap, fz, ae_ratio, rake_angle_deg, edge_radius_um, runout_um, n_trials);
      const mcMean = mcForces.reduce((s, v) => s + v, 0) / mcForces.length;
      const mcVar = mcForces.reduce((s, v) => s + (v - mcMean) ** 2, 0) / (mcForces.length - 1);
      mcResult = {
        mean: round2(mcMean),
        std_dev: round2(Math.sqrt(mcVar)),
        histogram: this.buildHistogram(mcForces),
      };
    }

    // ── FOSM ──
    let fosmResult: StochasticForceResult["fosm"] = null;

    if (method === "fosm" || method === "both") {
      const fosm = this.runFOSM(scatter, ap, fz, ae_ratio, rake_angle_deg, edge_radius_um, runout_um);
      fosmResult = { mean: round2(fosm.mean), std_dev: round2(fosm.std_dev) };
    }

    // ── Sobol (always computed when MC is run, uses smaller base sample) ──
    const sobolN = Math.min(Math.max(Math.floor(n_trials / 4), 256), 1024);
    const sobolIndices = (method === "mc" || method === "both")
      ? this.computeSobol(scatter, ap, fz, ae_ratio, rake_angle_deg, edge_radius_um, runout_um, sobolN)
      : [];

    // ── Aggregate results ──
    // Use MC if available, else FOSM
    const primaryMean = mcResult ? mcResult.mean : fosmResult!.mean;
    const primaryStd = mcResult ? mcResult.std_dev : fosmResult!.std_dev;

    // Confidence intervals (normal approximation, or empirical if MC)
    let ci95: [number, number];
    let ci99: [number, number];

    if (mcForces.length > 0) {
      const sorted = [...mcForces].sort((a, b) => a - b);
      const n = sorted.length;
      ci95 = [round2(sorted[Math.floor(n * 0.025)]), round2(sorted[Math.floor(n * 0.975)])];
      ci99 = [round2(sorted[Math.floor(n * 0.005)]), round2(sorted[Math.floor(n * 0.995)])];
    } else {
      ci95 = [round2(primaryMean - 1.96 * primaryStd), round2(primaryMean + 1.96 * primaryStd)];
      ci99 = [round2(primaryMean - 2.576 * primaryStd), round2(primaryMean + 2.576 * primaryStd)];
    }

    const cvPercent = round2((primaryStd / Math.max(primaryMean, 1e-9)) * 100);

    // Exceedance
    const pExceed = mcForces.length > 0
      ? this.computeExceedance(mcForces, primaryMean)
      : [];

    // Dominant uncertainty
    const dominant = sobolIndices.length > 0
      ? sobolIndices.reduce((best, cur) => cur.STi > best.STi ? cur : best).parameter
      : "kc1_1"; // default if Sobol not run

    // Material scatter summary
    const materialScatter = [
      { parameter: "kc1_1", mean: scatter.kc1_1_mean, cv_pct: round2(scatter.kc1_1_cv * 100) },
      { parameter: "mc", mean: scatter.mc_mean, cv_pct: round2(scatter.mc_cv * 100) },
      { parameter: "yield_mpa", mean: scatter.yield_mpa_mean, cv_pct: round2(scatter.yield_mpa_cv * 100) },
      { parameter: "friction_angle_deg", mean: scatter.friction_angle_deg_mean, cv_pct: round2(scatter.friction_angle_deg_cv * 100) },
    ];

    const result: StochasticForceResult = {
      mean_force_n: round2(primaryMean),
      std_dev_n: round2(primaryStd),
      ci_95: ci95,
      ci_99: ci99,
      cv_percent: cvPercent,
      p_exceed: pExceed,
      sobol_indices: sobolIndices,
      fosm: fosmResult,
      mc: mcResult,
      dominant_uncertainty: dominant,
      material_scatter: materialScatter,
      material_matched,
      warnings,
    };

    const formula =
      `Fc = kc1_1 * ap * fz^(1-mc) * sqrt(ae/D) * corrections` +
      ` | ${method.toUpperCase()} propagation, N=${n_trials}`;

    return {
      value: result,
      unit: "N",
      formula,
      // MC gives higher confidence than FOSM alone; an unmatched material (default-scatter
      // fallback) collapses confidence to 0.5 regardless of method — the scatter is not
      // material-specific, so the result must not be reported at full confidence (R12).
      confidence: material_matched ? (mcResult ? 0.95 : 0.90) : 0.5,
    };
  }
}

// ─── Utilities ─────────────────────────────────────────────────────

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ─── Singleton Export ──────────────────────────────────────────────

export const stochasticCuttingForceEngine = new StochasticCuttingForceEngine();
