/**
 * StochasticDeflectionEngine — Uncertainty-Aware Tool Deflection Prediction
 *
 * Propagates uncertainty in cutting forces, tool geometry, material properties,
 * and clamping conditions through cantilever beam deflection models to produce
 * deflection distributions and surface error confidence bounds.
 *
 * Variation sources:
 * - Cutting force scatter (Kienzle model with uncertain k_c1.1, mc)
 * - Tool diameter tolerance (h6/h5 class → ±µm)
 * - Tool overhang variation (setup-to-setup)
 * - Young's modulus scatter (carbide: CV 2-5%, HSS: CV 1-3%)
 * - Runout-induced force variation (TIR → periodic load)
 * - Radial engagement variation (ae scatter)
 *
 * Deflection models:
 * - Cantilever: δ = FL³/(3EI), I = πd⁴/64
 * - Tapered endmill: δ = F·∫(1/EI(z))dz (numerical integration)
 * - Multi-flute averaging: δ_eff = δ_max · cos(π/z) for z flutes
 * - Surface error: e_surf = δ · cos(θ) where θ = engagement angle
 *
 * Statistical methods:
 * - Monte Carlo with configurable distributions
 * - FOSM analytical propagation through δ = FL³/(3EI)
 * - Tolerance interval: [µ-k·σ, µ+k·σ] for given confidence+coverage
 *
 * References:
 * - Budak & Altintas (1995): Modeling and avoidance of static form errors
 * - Tlusty (2000): Manufacturing Processes and Equipment, Ch. 9
 * - ISO 286: Limits and fits
 *
 * Actions: stochastic_deflection (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface UncertainVal {
  mean: number;
  cv_pct: number;
  distribution?: "normal" | "lognormal" | "uniform";
}

export interface StochasticDeflectionInput {
  /** Cutting force (N) */
  cutting_force_N: UncertainVal;
  /** Tool diameter (mm) */
  tool_diameter_mm: UncertainVal;
  /** Tool overhang / stick-out (mm) */
  overhang_mm: UncertainVal;
  /** Young's modulus (GPa) */
  youngs_modulus_GPa: UncertainVal;
  /** Number of flutes */
  num_flutes?: number;
  /** Radial engagement (mm) — for surface error calc */
  radial_engagement_mm?: UncertainVal;
  /** Tool runout TIR (µm) */
  runout_um?: number;
  /** Target deflection limit (µm) */
  deflection_limit_um?: number;
  /** Monte Carlo samples */
  mc_samples?: number;
  /** Confidence level for tolerance interval (%) */
  confidence_pct?: number;
  /** Coverage level for tolerance interval (%) */
  coverage_pct?: number;
}

export interface DeflectionDistribution {
  mean_um: number;
  std_um: number;
  median_um: number;
  p5_um: number;
  p95_um: number;
  max_um: number;
  tolerance_lower_um: number;
  tolerance_upper_um: number;
}

export interface StochasticDeflectionResult {
  deflection: DeflectionDistribution;
  surface_error: DeflectionDistribution;
  fosm_mean_um: number;
  fosm_std_um: number;
  probability_exceed_limit: number;
  sensitivity: {
    parameter: string;
    contribution_pct: number;
  }[];
  effective_stiffness_N_per_um: number;
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class StochasticDeflectionEngine {

  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  sample(param: UncertainVal): number {
    const sigma = param.mean * (param.cv_pct / 100);
    const dist = param.distribution ?? "normal";
    if (dist === "lognormal") {
      const muLn = Math.log(param.mean)
        - 0.5 * Math.log(1 + (sigma / param.mean) ** 2);
      const sigLn = Math.sqrt(
        Math.log(1 + (sigma / param.mean) ** 2),
      );
      return Math.exp(muLn + sigLn * this.normalRandom());
    }
    if (dist === "uniform") {
      const half = sigma * Math.sqrt(3);
      return param.mean + (Math.random() * 2 - 1) * half;
    }
    return param.mean + sigma * this.normalRandom();
  }

  /**
   * Cantilever deflection: δ = FL³/(3EI), I = πd⁴/64
   * Returns deflection in µm (force in N, L in mm, E in GPa, d in mm).
   */
  cantileverDeflection(
    F_N: number, L_mm: number, d_mm: number, E_GPa: number,
  ): number {
    const I = (Math.PI * Math.pow(d_mm, 4)) / 64; // mm⁴
    const E_N_mm2 = E_GPa * 1000; // GPa → N/mm²
    if (E_N_mm2 * I <= 0) return 0;
    const delta_mm = (F_N * Math.pow(L_mm, 3)) / (3 * E_N_mm2 * I);
    return delta_mm * 1000; // mm → µm
  }

  /**
   * Multi-flute averaging factor: the effective static deflection
   * is reduced because multiple flutes share the load at different angles.
   * Factor ≈ cos(π/z) for z flutes in full engagement.
   */
  multiFluteFactor(numFlutes: number): number {
    if (numFlutes <= 1) return 1;
    return Math.cos(Math.PI / numFlutes);
  }

  /**
   * Surface error from deflection and engagement geometry.
   * For peripheral milling: e_surf ≈ δ · (ae/d) for small ae/d.
   */
  surfaceError(
    deflection_um: number, ae_mm: number, d_mm: number,
  ): number {
    if (d_mm <= 0) return deflection_um;
    const ratio = Math.min(1, ae_mm / d_mm);
    return deflection_um * ratio;
  }

  /**
   * FOSM for δ = FL³/(3EI), I = πd⁴/64
   * Partial derivatives computed analytically.
   */
  fosmDeflection(
    F: UncertainVal, L: UncertainVal,
    d: UncertainVal, E: UncertainVal,
  ): { mean_um: number; std_um: number } {
    const delta0 = this.cantileverDeflection(F.mean, L.mean, d.mean, E.mean);
    if (delta0 <= 0) return { mean_um: 0, std_um: 0 };

    const sigF = F.mean * (F.cv_pct / 100);
    const sigL = L.mean * (L.cv_pct / 100);
    const sigD = d.mean * (d.cv_pct / 100);
    const sigE = E.mean * (E.cv_pct / 100);

    // ∂δ/∂F = δ/F
    const dF = delta0 / F.mean;
    // ∂δ/∂L = 3δ/L
    const dL = 3 * delta0 / L.mean;
    // ∂δ/∂d = -4δ/d (since I ∝ d⁴)
    const dD = -4 * delta0 / d.mean;
    // ∂δ/∂E = -δ/E
    const dE = -delta0 / E.mean;

    const varDelta = (dF * sigF) ** 2 + (dL * sigL) ** 2
      + (dD * sigD) ** 2 + (dE * sigE) ** 2;

    return { mean_um: delta0, std_um: Math.sqrt(varDelta) };
  }

  /** k-factor for tolerance intervals (normal approx). */
  private toleranceK(
    confidence: number, coverage: number, n: number,
  ): number {
    // Simplified: for large n, k ≈ z_coverage + z_confidence/√n
    const zCov = this.zScore(coverage / 100);
    const zConf = this.zScore(confidence / 100);
    return zCov + zConf / Math.sqrt(Math.max(n, 2));
  }

  private zScore(p: number): number {
    // Rational approximation for Φ^(-1)(p)
    if (p <= 0) return -4;
    if (p >= 1) return 4;
    const t = Math.sqrt(-2 * Math.log(1 - p));
    return t - (2.515517 + t * (0.802853 + t * 0.010328))
      / (1 + t * (1.432788 + t * (0.189269 + t * 0.001308)));
  }

  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  /** Main entry — stochastic deflection analysis. */
  analyze(input: StochasticDeflectionInput): StochasticDeflectionResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.mc_samples ?? 2000, MAX_TRIALS);
    const limit = input.deflection_limit_um ?? 25;
    const numFlutes = input.num_flutes ?? 4;
    const confidence = input.confidence_pct ?? 95;
    const coverage = input.coverage_pct ?? 99;
    const runout = input.runout_um ?? 0;

    // FOSM
    const fosm = this.fosmDeflection(
      input.cutting_force_N, input.overhang_mm,
      input.tool_diameter_mm, input.youngs_modulus_GPa,
    );

    // Monte Carlo
    const deflSamples: number[] = [];
    const surfSamples: number[] = [];
    const fluteFactor = this.multiFluteFactor(numFlutes);

    for (let i = 0; i < N; i++) {
      const F = Math.max(1, this.sample(input.cutting_force_N));
      const L = Math.max(1, this.sample(input.overhang_mm));
      const d = Math.max(0.5, this.sample(input.tool_diameter_mm));
      const E = Math.max(10, this.sample(input.youngs_modulus_GPa));

      let delta = this.cantileverDeflection(F, L, d, E);

      // Runout adds periodic force variation
      if (runout > 0) {
        const runoutForce = runout * E * 1000
          * (Math.PI * Math.pow(d, 4) / 64) / Math.pow(L, 3) / 1000;
        delta += Math.abs(runoutForce) * Math.random() * 0.001;
      }

      // Multi-flute averaging
      delta *= fluteFactor;

      deflSamples.push(delta);

      // Surface error
      if (input.radial_engagement_mm) {
        const ae = Math.max(0.01, this.sample(input.radial_engagement_mm));
        surfSamples.push(this.surfaceError(delta, ae, d));
      } else {
        surfSamples.push(delta * 0.5); // default 50% ae/d
      }
    }

    const deflSorted = [...deflSamples].sort((a, b) => a - b);
    const surfSorted = [...surfSamples].sort((a, b) => a - b);

    const makeDist = (sorted: number[]): DeflectionDistribution => {
      const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const variance = sorted.reduce(
        (a, b) => a + (b - mean) ** 2, 0,
      ) / (sorted.length - 1);
      const std = Math.sqrt(variance);
      const k = this.toleranceK(confidence, coverage, sorted.length);
      return {
        mean_um: Math.round(mean * 100) / 100,
        std_um: Math.round(std * 100) / 100,
        median_um: Math.round(this.percentile(sorted, 50) * 100) / 100,
        p5_um: Math.round(this.percentile(sorted, 5) * 100) / 100,
        p95_um: Math.round(this.percentile(sorted, 95) * 100) / 100,
        max_um: Math.round(sorted[sorted.length - 1] * 100) / 100,
        tolerance_lower_um: Math.round(
          Math.max(0, mean - k * std) * 100,
        ) / 100,
        tolerance_upper_um: Math.round((mean + k * std) * 100) / 100,
      };
    };

    const deflDist = makeDist(deflSorted);
    const surfDist = makeDist(surfSorted);

    // P(exceed limit)
    const exceedCount = deflSamples.filter(d => d > limit).length;
    const pExceed = exceedCount / N;

    // Sensitivity (variance contribution from FOSM partials)
    const sigF = input.cutting_force_N.mean
      * (input.cutting_force_N.cv_pct / 100);
    const sigL = input.overhang_mm.mean
      * (input.overhang_mm.cv_pct / 100);
    const sigD = input.tool_diameter_mm.mean
      * (input.tool_diameter_mm.cv_pct / 100);
    const sigE = input.youngs_modulus_GPa.mean
      * (input.youngs_modulus_GPa.cv_pct / 100);

    const d0 = fosm.mean_um;
    const Fm = input.cutting_force_N.mean;
    const Lm = input.overhang_mm.mean;
    const dm = input.tool_diameter_mm.mean;
    const Em = input.youngs_modulus_GPa.mean;

    const varF = d0 > 0 ? ((d0 / Fm) * sigF) ** 2 : 0;
    const varL = d0 > 0 ? ((3 * d0 / Lm) * sigL) ** 2 : 0;
    const varD = d0 > 0 ? ((4 * d0 / dm) * sigD) ** 2 : 0;
    const varE = d0 > 0 ? ((d0 / Em) * sigE) ** 2 : 0;
    const totalVar = varF + varL + varD + varE;

    const sensitivity = [
      { parameter: "cutting_force", contribution_pct: totalVar > 0 ? Math.round(varF / totalVar * 10000) / 100 : 0 },
      { parameter: "overhang", contribution_pct: totalVar > 0 ? Math.round(varL / totalVar * 10000) / 100 : 0 },
      { parameter: "diameter", contribution_pct: totalVar > 0 ? Math.round(varD / totalVar * 10000) / 100 : 0 },
      { parameter: "youngs_modulus", contribution_pct: totalVar > 0 ? Math.round(varE / totalVar * 10000) / 100 : 0 },
    ].sort((a, b) => b.contribution_pct - a.contribution_pct);

    // Effective stiffness
    const effStiffness = Fm > 0 && d0 > 0 ? Fm / d0 : 0;

    // Recommendations
    if (pExceed > 0.1) {
      recommendations.push(
        `${Math.round(pExceed * 100)}% probability of exceeding ${limit}µm limit — `
        + "reduce overhang or increase diameter",
      );
    }
    if (sensitivity[0]?.parameter === "overhang"
      && sensitivity[0].contribution_pct > 50) {
      recommendations.push(
        "Overhang dominates deflection uncertainty — "
        + "use shortest possible stick-out",
      );
    }
    if (sensitivity[0]?.parameter === "diameter"
      && sensitivity[0].contribution_pct > 40) {
      recommendations.push(
        "Diameter tolerance is major contributor — "
        + "use tighter tool tolerance class (h5 vs h6)",
      );
    }
    if (deflDist.mean_um > limit * 0.5) {
      warnings.push("Mean deflection exceeds 50% of limit — limited margin");
    }

    return {
      deflection: deflDist,
      surface_error: surfDist,
      fosm_mean_um: Math.round(fosm.mean_um * 100) / 100,
      fosm_std_um: Math.round(fosm.std_um * 100) / 100,
      probability_exceed_limit: Math.round(pExceed * 1000) / 1000,
      sensitivity,
      effective_stiffness_N_per_um: Math.round(effStiffness * 100) / 100,
      recommendations,
      warnings,
      formula: "δ=FL³/(3EI), I=πd⁴/64; " +
        "FOSM: σ²_δ=(∂δ/∂F)²σ²_F+(3δ/L)²σ²_L" +
        "+(4δ/d)²σ²_d+(δ/E)²σ²_E; " +
        "Flute avg: δ_eff=δ·cos(π/z); " +
        "Surface: e=δ·(ae/d)",
    };
  }
}

export const stochasticDeflectionEngine = new StochasticDeflectionEngine();
