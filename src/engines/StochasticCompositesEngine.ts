/**
 * StochasticCompositesEngine — Monte Carlo Delamination & Sensitivity Analysis
 *
 * Composite machining (drilling/milling CFRP, GFRP, aramid) suffers from
 * delamination driven by thrust force exceeding inter-ply shear strength.
 * Both fiber strength and interface shear exhibit high stochastic scatter
 * (CV 8-20%) due to fiber misalignment, resin voids, and cure variability.
 *
 * Physics models:
 * - Tsai-Hill failure criterion: (σ1/X)² - (σ1·σ2/X²) + (σ2/Y)² + (τ12/S)² ≤ 1
 * - Critical thrust force (Hocheng-Dharan): Fc = π·√(8·G_Ic·E·h³/(3·(1-ν²)))
 * - Feed-dependent thrust: Ft ∝ f^α · Vc^β · d^γ (empirical)
 * - Delamination factor: Fd = D_max / D_nominal
 *
 * References:
 * - Hocheng & Dharan (1990): Delamination during drilling of composite laminates
 * - Tsai & Wu (1971): General theory of strength for anisotropic materials
 * - Davim (2009): Machining Composite Materials
 *
 * Actions: stochastic_composite_mc, stochastic_composite_sensitivity (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface CompositeDelaminationInput {
  /** Fiber type */
  fiber_type: "carbon" | "glass" | "aramid" | "basalt";
  /** Layup angle (degrees) */
  layup_angle_deg: number;
  /** Feed rate (mm/rev for drilling, mm/tooth for milling) */
  feed_mm: number;
  /** Cutting speed (m/min) */
  speed_mpm: number;
  /** Tool diameter (mm) */
  tool_diameter_mm: number;
  /** Number of Monte Carlo samples */
  n_samples?: number;
  /** Coefficient of variation for fiber strength (fraction, e.g. 0.12) */
  fiber_strength_cov?: number;
  /** Coefficient of variation for interface shear (fraction, e.g. 0.15) */
  interface_shear_cov?: number;
}

export interface CompositeDistribution {
  mean: number;
  std: number;
  p5: number;
  p95: number;
}

export interface CompositeDelaminationResult {
  delamination_probability: number;
  risk_ci_95: [number, number];
  Tsai_Hill_distribution: CompositeDistribution;
  critical_thrust_force_distribution: CompositeDistribution;
  recommended_safety_factor: number;
  thrust_force_mean_N: number;
  risk_level: "negligible" | "low" | "moderate" | "high" | "critical";
  formula: string;
}

export interface CompositeSensitivityInput {
  base_params: CompositeDelaminationInput;
  vary_parameters: string[];
}

export interface SensitivityIndex {
  parameter: string;
  first_order_Si: number;
  effect_direction: "increases_risk" | "decreases_risk" | "neutral";
}

export interface CompositeSensitivityResult {
  indices: SensitivityIndex[];
  dominant_parameter: string;
  formula: string;
}

// ── Fiber property database ────────────────────────────────────────────

interface FiberProps {
  tensile_strength_MPa: number;
  transverse_strength_MPa: number;
  shear_strength_MPa: number;
  E_longitudinal_GPa: number;
  E_transverse_GPa: number;
  G_Ic_J_m2: number;  // Mode I fracture toughness
  poisson: number;
}

const FIBER_DB: Record<string, FiberProps> = {
  carbon:  { tensile_strength_MPa: 2400, transverse_strength_MPa: 60, shear_strength_MPa: 80, E_longitudinal_GPa: 135, E_transverse_GPa: 10, G_Ic_J_m2: 250, poisson: 0.30 },
  glass:   { tensile_strength_MPa: 1500, transverse_strength_MPa: 40, shear_strength_MPa: 55, E_longitudinal_GPa: 45,  E_transverse_GPa: 12, G_Ic_J_m2: 800, poisson: 0.28 },
  aramid:  { tensile_strength_MPa: 2800, transverse_strength_MPa: 30, shear_strength_MPa: 45, E_longitudinal_GPa: 75,  E_transverse_GPa: 5.5, G_Ic_J_m2: 400, poisson: 0.34 },
  basalt:  { tensile_strength_MPa: 1800, transverse_strength_MPa: 50, shear_strength_MPa: 65, E_longitudinal_GPa: 55,  E_transverse_GPa: 14, G_Ic_J_m2: 600, poisson: 0.26 },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class StochasticCompositesEngine {

  /** Box-Muller normal random */
  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Sample from normal distribution with given mean and CV (as fraction) */
  private sampleNormal(mean: number, cv: number): number {
    return Math.max(mean * (1 + cv * this.normalRandom()), mean * 0.1);
  }

  /**
   * Tsai-Hill failure index for given stress state and strengths.
   * Returns index >= 1 means failure.
   */
  private tsaiHill(
    sigma1: number, sigma2: number, tau12: number,
    X: number, Y: number, S: number,
  ): number {
    return (sigma1 / X) ** 2
      - (sigma1 * sigma2) / (X ** 2)
      + (sigma2 / Y) ** 2
      + (tau12 / S) ** 2;
  }

  /**
   * Hocheng-Dharan critical thrust force for delamination onset.
   * Fc = π · √(8 · G_Ic · E · h³ / (3 · (1 - ν²)))
   * Uses remaining thickness h at drill exit.
   */
  private criticalThrust(GIc: number, E_GPa: number, h_mm: number, nu: number): number {
    const E_Pa = E_GPa * 1e9;
    const h_m = h_mm * 1e-3;
    const GIc_Pa = GIc; // J/m²
    const Fc = Math.PI * Math.sqrt(8 * GIc_Pa * E_Pa * h_m ** 3 / (3 * (1 - nu ** 2)));
    return Fc; // Newtons
  }

  /**
   * Empirical thrust force model:
   * Ft = k · f^α · Vc^β · d^γ
   * where k depends on fiber type, α ≈ 0.7, β ≈ 0.1, γ ≈ 0.8
   */
  private thrustForce(feed: number, speed: number, diameter: number, fiberType: string): number {
    const kMap: Record<string, number> = { carbon: 120, glass: 80, aramid: 95, basalt: 90 };
    const k = kMap[fiberType] || 100;
    return k * Math.pow(feed, 0.7) * Math.pow(Math.max(speed, 1), 0.1) * Math.pow(diameter, 0.8);
  }

  /**
   * Monte Carlo delamination simulation.
   * Randomizes fiber strength, interface shear, and thrust force scatter.
   */
  monteCarloDelamination(input: CompositeDelaminationInput): CompositeDelaminationResult {
    const fiber = FIBER_DB[input.fiber_type] || FIBER_DB.carbon;
    const nSamples = input.n_samples || 1000;
    const fiberCov = input.fiber_strength_cov ?? 0.12;
    const shearCov = input.interface_shear_cov ?? 0.15;

    // Angle-dependent stress transformation
    const theta = (input.layup_angle_deg * Math.PI) / 180;
    const cos2 = Math.cos(theta) ** 2;
    const sin2 = Math.sin(theta) ** 2;
    const cs = Math.cos(theta) * Math.sin(theta);

    // Nominal thrust force
    const Ft_nom = this.thrustForce(input.feed_mm, input.speed_mpm, input.tool_diameter_mm, input.fiber_type);

    // Remaining thickness at critical point (assume last ply ~0.125mm for carbon, 0.2 for glass)
    const hPly = input.fiber_type === "carbon" ? 0.125 : input.fiber_type === "aramid" ? 0.15 : 0.2;

    const tsaiHillValues: number[] = [];
    const critForceValues: number[] = [];
    let delaminationCount = 0;

    for (let i = 0; i < nSamples; i++) {
      // Randomize strengths
      const X = this.sampleNormal(fiber.tensile_strength_MPa, fiberCov);
      const Y = this.sampleNormal(fiber.transverse_strength_MPa, fiberCov);
      const S = this.sampleNormal(fiber.shear_strength_MPa, shearCov);

      // Randomize fracture toughness
      const GIc = this.sampleNormal(fiber.G_Ic_J_m2, shearCov);

      // Thrust force with scatter (CV ~10%)
      const Ft = this.sampleNormal(Ft_nom, 0.10);

      // Convert thrust to ply stresses (simplified)
      const sigma_eff = Ft / (Math.PI * input.tool_diameter_mm * hPly); // MPa approximate
      const sigma1 = sigma_eff * cos2;
      const sigma2 = sigma_eff * sin2;
      const tau12 = sigma_eff * cs;

      const th = this.tsaiHill(sigma1, sigma2, tau12, X, Y, S);
      tsaiHillValues.push(th);

      // Critical thrust force
      const Fc = this.criticalThrust(GIc, fiber.E_longitudinal_GPa, hPly, fiber.poisson);
      critForceValues.push(Fc);

      // Delamination occurs if thrust > critical OR Tsai-Hill > 1
      if (Ft > Fc || th >= 1.0) {
        delaminationCount++;
      }
    }

    const delamProb = delaminationCount / nSamples;

    // Wilson score CI for proportion
    const z = 1.96;
    const pHat = delamProb;
    const n = nSamples;
    const denom = 1 + z * z / n;
    const center = (pHat + z * z / (2 * n)) / denom;
    const halfWidth = (z * Math.sqrt(pHat * (1 - pHat) / n + z * z / (4 * n * n))) / denom;
    const ciLow = Math.max(0, center - halfWidth);
    const ciHigh = Math.min(1, center + halfWidth);

    // Distribution stats helper
    const distStats = (arr: number[]): CompositeDistribution => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
      return {
        mean,
        std: Math.sqrt(variance),
        p5: sorted[Math.floor(arr.length * 0.05)],
        p95: sorted[Math.floor(arr.length * 0.95)],
      };
    };

    // Risk level
    let riskLevel: "negligible" | "low" | "moderate" | "high" | "critical";
    if (delamProb < 0.01) riskLevel = "negligible";
    else if (delamProb < 0.05) riskLevel = "low";
    else if (delamProb < 0.15) riskLevel = "moderate";
    else if (delamProb < 0.35) riskLevel = "high";
    else riskLevel = "critical";

    // Safety factor: ratio of mean critical force to mean thrust
    const meanCritForce = critForceValues.reduce((s, v) => s + v, 0) / nSamples;
    const safetyFactor = meanCritForce / Math.max(Ft_nom, 0.01);

    return {
      delamination_probability: delamProb,
      risk_ci_95: [ciLow, ciHigh],
      Tsai_Hill_distribution: distStats(tsaiHillValues),
      critical_thrust_force_distribution: distStats(critForceValues),
      recommended_safety_factor: Math.max(1.0, safetyFactor > 3 ? 1.5 : safetyFactor > 1.5 ? 2.0 : 3.0),
      thrust_force_mean_N: Ft_nom,
      risk_level: riskLevel,
      formula: "Hocheng-Dharan Fc=π√(8·GIc·E·h³/(3(1-ν²))), Tsai-Hill (σ1/X)²-(σ1σ2/X²)+(σ2/Y)²+(τ12/S)²≤1",
    };
  }

  /**
   * Sobol-like sensitivity analysis via one-at-a-time perturbation.
   * Varies each parameter ±20% and measures effect on delamination probability.
   */
  sensitivityAnalysis(input: CompositeSensitivityInput): CompositeSensitivityResult {
    const base = input.base_params;
    const varyParams = input.vary_parameters;
    const nSamples = base.n_samples || 500;

    // Baseline delamination probability
    const baseResult = this.monteCarloDelamination({ ...base, n_samples: nSamples });
    const baseProb = baseResult.delamination_probability;

    const indices: SensitivityIndex[] = [];
    const perturbFraction = 0.20; // ±20%

    const paramGetSet: Record<string, { get: (p: CompositeDelaminationInput) => number; set: (p: CompositeDelaminationInput, v: number) => CompositeDelaminationInput }> = {
      feed_mm:           { get: p => p.feed_mm, set: (p, v) => ({ ...p, feed_mm: v }) },
      speed_mpm:         { get: p => p.speed_mpm, set: (p, v) => ({ ...p, speed_mpm: v }) },
      tool_diameter_mm:  { get: p => p.tool_diameter_mm, set: (p, v) => ({ ...p, tool_diameter_mm: v }) },
      layup_angle_deg:   { get: p => p.layup_angle_deg, set: (p, v) => ({ ...p, layup_angle_deg: v }) },
      fiber_strength_cov:{ get: p => p.fiber_strength_cov ?? 0.12, set: (p, v) => ({ ...p, fiber_strength_cov: v }) },
      interface_shear_cov:{ get: p => p.interface_shear_cov ?? 0.15, set: (p, v) => ({ ...p, interface_shear_cov: v }) },
    };

    for (const param of varyParams) {
      const gs = paramGetSet[param];
      if (!gs) continue;

      const baseVal = gs.get(base);
      if (baseVal === 0) {
        indices.push({ parameter: param, first_order_Si: 0, effect_direction: "neutral" });
        continue;
      }

      const highParams = gs.set(base, baseVal * (1 + perturbFraction));
      const lowParams = gs.set(base, baseVal * (1 - perturbFraction));

      const highResult = this.monteCarloDelamination({ ...highParams, n_samples: nSamples });
      const lowResult = this.monteCarloDelamination({ ...lowParams, n_samples: nSamples });

      // Sensitivity index: normalized change in output / normalized change in input
      const dProb = highResult.delamination_probability - lowResult.delamination_probability;
      const dInput = 2 * perturbFraction; // normalized input change
      const Si = Math.abs(dProb) / Math.max(dInput, 0.001);

      const direction: "increases_risk" | "decreases_risk" | "neutral" =
        dProb > 0.005 ? "increases_risk" :
        dProb < -0.005 ? "decreases_risk" : "neutral";

      indices.push({ parameter: param, first_order_Si: Si, effect_direction: direction });
    }

    // Normalize Si values to sum to 1 (if any non-zero)
    const totalSi = indices.reduce((s, idx) => s + idx.first_order_Si, 0);
    if (totalSi > 0) {
      for (const idx of indices) {
        idx.first_order_Si = idx.first_order_Si / totalSi;
      }
    } else {
      // All zero — assign equal weights
      const equal = 1 / Math.max(indices.length, 1);
      for (const idx of indices) {
        idx.first_order_Si = equal;
      }
    }

    const dominant = indices.reduce((best, idx) => idx.first_order_Si > best.first_order_Si ? idx : best, indices[0]);

    return {
      indices,
      dominant_parameter: dominant?.parameter || "none",
      formula: "OAT sensitivity: Si = |ΔP(delam)| / Δinput, normalized to Σ=1",
    };
  }
}

export const stochasticCompositesEngine = new StochasticCompositesEngine();
