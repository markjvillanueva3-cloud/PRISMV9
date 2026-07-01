/**
 * StochasticEDMEngine — Uncertainty-Aware EDM Process Prediction
 *
 * EDM is inherently stochastic: each discharge has random energy,
 * location, and duration. This engine models discharge-level variability
 * and propagates it to MRR, surface integrity, and electrode wear.
 *
 * Variation sources:
 * - Discharge energy (exponential distribution, λ = 1/E_mean)
 * - Gap voltage scatter (normal, CV 5-10%)
 * - Pulse duration jitter (uniform ±5%)
 * - Debris concentration (affects short-circuit rate)
 * - Electrode wear rate (log-normal, CV 20-40%)
 * - Recast layer thickness (Weibull from thermal penetration scatter)
 *
 * Models:
 * - Single discharge crater: d_crater = k · E^(1/3), h = k2 · E^(1/3)
 * - MRR = f_eff · E_pulse · f_rep / ρ·(c·ΔT + L_m)
 * - Electrode wear ratio: θ = V_electrode / V_workpiece
 * - Recast depth: t_recast = 2·√(α·t_pulse) (thermal penetration)
 * - Surface roughness: Ra = k_ra × I_p^0.40 × t_on^0.28 [Klocke 2013 canonical]
 * - Short-circuit probability: P_sc = 1 - exp(-λ_debris · C_debris)
 *
 * References:
 * - DiBitonto et al. (1989): Theoretical models of EDM process
 * - Kunieda et al. (2005): Advancing EDM through fundamental insight
 * - Mohd Abbas et al. (2007): A review on current research trends in EDM
 * - Schumacher (2004): Modeling of the micro EDM process
 *
 * Actions: stochastic_edm (calcDispatcher)
 */

import { klockeRaFromEnergy } from "./utils/klockeRa.js";

// ── Types ──────────────────────────────────────────────────────────────

export interface EDMUncertaintyInput {
  /** Discharge energy per pulse (mJ) */
  pulse_energy_mJ: number;
  /** Pulse on-time (µs) */
  pulse_on_us: number;
  /** Pulse off-time (µs) */
  pulse_off_us: number;
  /** Gap voltage (V) */
  gap_voltage_V: number;
  /** Peak current (A) */
  peak_current_A: number;

  /** EDM type */
  edm_type?: "sinker" | "wire" | "micro";

  /** Workpiece material */
  material?: "steel" | "carbide" | "titanium" | "inconel" | "copper";
  /** Material melting point (°C) */
  melting_point_C?: number;
  /** Thermal diffusivity (mm²/s) */
  thermal_diffusivity_mm2_s?: number;

  /** Electrode material */
  electrode_material?: "copper" | "graphite" | "tungsten";

  /** Flushing condition */
  flushing_pressure_bar?: number;
  /** Parts since electrode dress */
  parts_since_dress?: number;

  /** Monte Carlo samples */
  mc_samples?: number;

  /** Variation coefficients */
  energy_cv_pct?: number;
  voltage_cv_pct?: number;
  wear_cv_pct?: number;
}

export interface EDMDistribution {
  mean: number;
  std: number;
  p5: number;
  p95: number;
  unit: string;
}

export interface StochasticEDMResult {
  mrr_mm3_min: EDMDistribution;
  surface_roughness_Ra: EDMDistribution;
  recast_depth_um: EDMDistribution;
  electrode_wear_ratio: EDMDistribution;
  short_circuit_probability_pct: number;
  crater_diameter_um: EDMDistribution;
  process_efficiency_pct: number;
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── Material database ──────────────────────────────────────────────────

interface EDMMaterial {
  rho_kg_m3: number;
  Tm_C: number;
  alpha_mm2_s: number;
  Lm_J_kg: number;  // latent heat of melting
  cp_J_kgK: number;
}

const EDM_MATS: Record<string, EDMMaterial> = {
  steel:   { rho_kg_m3: 7850, Tm_C: 1500, alpha_mm2_s: 14, Lm_J_kg: 270000, cp_J_kgK: 460 },
  carbide: { rho_kg_m3: 14500, Tm_C: 2800, alpha_mm2_s: 25, Lm_J_kg: 350000, cp_J_kgK: 200 },
  titanium:{ rho_kg_m3: 4500, Tm_C: 1670, alpha_mm2_s: 2.9, Lm_J_kg: 440000, cp_J_kgK: 520 },
  inconel: { rho_kg_m3: 8200, Tm_C: 1350, alpha_mm2_s: 3.1, Lm_J_kg: 290000, cp_J_kgK: 440 },
  copper:  { rho_kg_m3: 8960, Tm_C: 1085, alpha_mm2_s: 117, Lm_J_kg: 205000, cp_J_kgK: 385 },
};

const ELECTRODE_WEAR: Record<string, number> = {
  copper: 0.15,    // typical wear ratio
  graphite: 0.05,
  tungsten: 0.02,
};

// ── Engine ─────────────────────────────────────────────────────────────

export class StochasticEDMEngine {

  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Exponential random: models single-discharge energy variation */
  private exponentialRandom(mean: number): number {
    return -mean * Math.log(Math.random() || 1e-10);
  }

  private sampleNormal(mean: number, cv: number): number {
    return mean * (1 + (cv / 100) * this.normalRandom());
  }

  private sampleLogNormal(mean: number, cv: number): number {
    // Correct lognormal parameterization (U-WH08):
    // sigma_ln = sqrt(ln(1 + CV²)) where CV is fractional (cv/100)
    // Previous code used sigma = cv/100 directly, which underestimates
    // spread for CV > ~20% and overestimates for very small CV.
    // Ref: Aitchison & Brown, The Lognormal Distribution, 1957
    const cvFrac = cv / 100;
    const sigma = Math.sqrt(Math.log(1 + cvFrac * cvFrac));
    const mu = Math.log(mean) - 0.5 * sigma * sigma;
    return Math.exp(mu + sigma * this.normalRandom());
  }

  /**
   * Single discharge crater geometry:
   * d_crater = k · E^(1/3), depth = k2 · E^(1/3)
   * where k depends on material thermal properties.
   */
  craterDiameter(energy_mJ: number, alpha_mm2_s: number): number {
    // Thermal scaling: d ∝ (α·E)^(1/3)
    const k = 8; // µm/(mJ·mm²/s)^(1/3)
    return k * Math.pow(energy_mJ * alpha_mm2_s, 1 / 3);
  }

  /**
   * MRR from pulse parameters:
   * MRR = η · E_pulse · f_rep / (ρ · (cp·ΔT + Lm))
   * where f_rep = 1 / (t_on + t_off)
   */
  materialRemovalRate(
    energy_mJ: number, tOn_us: number, tOff_us: number,
    efficiency: number, rho: number, cp: number,
    Tm: number, Lm: number,
  ): number {
    const fRep = 1e6 / (tOn_us + tOff_us); // Hz
    const energyJ = energy_mJ / 1000;
    const specificEnergy = rho * (cp * Tm + Lm); // J/m³
    const specificEnergy_mm3 = specificEnergy / 1e9; // J/mm³
    if (specificEnergy_mm3 <= 0) return 0;
    const mrr_mm3_s = efficiency * energyJ * fRep / specificEnergy_mm3;
    return mrr_mm3_s * 60; // mm³/min
  }

  /**
   * Recast layer depth from thermal penetration:
   * t_recast = k · √(α · t_pulse)
   */
  recastDepth(alpha_mm2_s: number, tOn_us: number): number {
    const tOn_s = tOn_us / 1e6;
    const depth_mm = 2 * Math.sqrt(alpha_mm2_s * tOn_s);
    return depth_mm * 1000; // µm
  }

  /**
   * Surface roughness from pulse energy using shared Klocke/Puertas&Luis model.
   * Ra = k_ra * I_p^alpha * t_on^beta (material-specific coefficients)
   * Derives I_p from E = V_gap * I_p * t_on with V_gap ≈ 45V.
   * Source: klockeRa shared utility (Klocke 2013 Table 8.3, Puertas & Luis 2004)
   */
  edmRoughness(energy_mJ: number, tOn_us: number, material?: string): number {
    return klockeRaFromEnergy(energy_mJ, tOn_us, material);
  }

  /**
   * Short-circuit probability from debris concentration:
   * P_sc = 1 - exp(-λ · parts_since_dress / flushing_factor)
   */
  shortCircuitProb(
    partsSinceDress: number, flushingPressure: number,
  ): number {
    const flushFactor = Math.max(1, flushingPressure) / 5;
    const lambda = 0.01; // debris accumulation rate
    return (1 - Math.exp(-lambda * partsSinceDress / flushFactor)) * 100;
  }

  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  makeDist(samples: number[], unit: string): EDMDistribution {
    const sorted = [...samples].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const variance = sorted.reduce(
      (a, b) => a + (b - mean) ** 2, 0,
    ) / Math.max(sorted.length - 1, 1);
    return {
      mean: Math.round(mean * 1000) / 1000,
      std: Math.round(Math.sqrt(variance) * 1000) / 1000,
      p5: Math.round(this.percentile(sorted, 5) * 1000) / 1000,
      p95: Math.round(this.percentile(sorted, 95) * 1000) / 1000,
      unit,
    };
  }

  /** Main entry — stochastic EDM analysis. */
  analyze(input: EDMUncertaintyInput): StochasticEDMResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.mc_samples ?? 1000, MAX_TRIALS);

    const mat = EDM_MATS[input.material ?? "steel"];
    const alpha = input.thermal_diffusivity_mm2_s ?? mat.alpha_mm2_s;
    const Tm = input.melting_point_C ?? mat.Tm_C;
    const elecWearBase = ELECTRODE_WEAR[
      input.electrode_material ?? "copper"
    ] ?? 0.15;

    const energyCV = input.energy_cv_pct ?? 25;
    const voltageCV = input.voltage_cv_pct ?? 8;
    const wearCV = input.wear_cv_pct ?? 30;

    const partsDress = input.parts_since_dress ?? 0;
    const flushP = input.flushing_pressure_bar ?? 5;

    // Monte Carlo
    const mrrSamples: number[] = [];
    const raSamples: number[] = [];
    const recastSamples: number[] = [];
    const wearSamples: number[] = [];
    const craterSamples: number[] = [];

    // EDM type efficiency
    const baseEff = input.edm_type === "wire" ? 0.15
      : input.edm_type === "micro" ? 0.08 : 0.25;

    for (let i = 0; i < N; i++) {
      // Discharge energy: exponential-like scatter
      const E = Math.max(0.01,
        this.exponentialRandom(input.pulse_energy_mJ) * 0.5
        + input.pulse_energy_mJ * 0.5);

      const tOn = Math.max(1, this.sampleNormal(input.pulse_on_us, 5));
      const eff = Math.max(0.01,
        this.sampleNormal(baseEff, 15));

      // MRR
      const mrr = this.materialRemovalRate(
        E, tOn, input.pulse_off_us, eff,
        mat.rho_kg_m3, mat.cp_J_kgK, Tm, mat.Lm_J_kg,
      );
      mrrSamples.push(Math.max(0, mrr));

      // Roughness
      raSamples.push(this.edmRoughness(E, tOn));

      // Recast
      const alphaS = this.sampleNormal(alpha, 10);
      recastSamples.push(this.recastDepth(
        Math.max(0.1, alphaS), tOn,
      ));

      // Electrode wear
      wearSamples.push(this.sampleLogNormal(elecWearBase, wearCV));

      // Crater size
      craterSamples.push(this.craterDiameter(E, alpha));
    }

    const scProb = this.shortCircuitProb(partsDress, flushP);
    const processEff = Math.round(baseEff * 100 * (1 - scProb / 100));

    // Recommendations
    if (scProb > 10) {
      recommendations.push(
        "Short-circuit probability " + Math.round(scProb) +
        "% — increase flushing pressure or re-dress electrode",
      );
    }
    const recastDist = this.makeDist(recastSamples, "µm");
    if (recastDist.p95 > 20) {
      recommendations.push(
        "Recast layer p95=" + recastDist.p95 +
        "µm — reduce pulse energy or on-time for critical surfaces",
      );
    }
    if (input.edm_type === "micro" && input.pulse_energy_mJ > 1) {
      warnings.push(
        "Pulse energy >1mJ for micro-EDM may cause excessive crater size",
      );
    }

    return {
      mrr_mm3_min: this.makeDist(mrrSamples, "mm³/min"),
      surface_roughness_Ra: this.makeDist(raSamples, "µm"),
      recast_depth_um: recastDist,
      electrode_wear_ratio: this.makeDist(wearSamples, "ratio"),
      short_circuit_probability_pct: Math.round(scProb * 100) / 100,
      crater_diameter_um: this.makeDist(craterSamples, "µm"),
      process_efficiency_pct: processEff,
      recommendations,
      warnings,
      formula: "d_crater=k·(α·E)^(1/3); " +
        "MRR=η·E·f_rep/(ρ·(cpΔT+Lm)); " +
        "t_recast=2√(α·t_on); " +
        "Ra=k_ra·I_p^0.40·t_on^0.28 [Klocke 2013]; " +
        "P_sc=1-exp(-λ·N_parts/flush); " +
        "θ_wear=V_elec/V_work (log-normal)",
    };
  }
}

export const stochasticEDMEngine = new StochasticEDMEngine();
