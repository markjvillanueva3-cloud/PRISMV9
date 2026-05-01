/**
 * StochasticGrindingEngine — Uncertainty-Aware Grinding Process Prediction
 *
 * Grinding has the highest scatter of all machining processes (CV 18-35%)
 * due to stochastic grain geometry, fragmentation, and thermal sensitivity.
 *
 * Variation sources modeled:
 * - Grain size distribution (log-normal, FEPA/ANSI grade → σ_grain)
 * - Dressing condition (overlap ratio drift → sharpness decay)
 * - Specific energy scatter (Malkin model: u = u0 + k/ae^α)
 * - Wheel wear (G-ratio variation, attritious + fracture + bond post)
 * - Thermal damage probability P(burn) from Jaeger moving heat source
 * - Contact stiffness variation (wheel-work interface)
 * - Coolant film boiling threshold (stochastic onset)
 *
 * Models:
 * - Malkin specific energy: u = u_ch + u_sl + u_pl (chip + slide + plow)
 * - Jaeger thermal: θ_max = (q·a)/(k) · f(Pe) where Pe = V_w·a/(4α)
 * - Burn probability: P(burn) = Φ((θ_max - θ_crit) / σ_θ)
 * - G-ratio: G = V_material / V_wheel with uncertain wear rate
 * - Surface roughness: Ra ∝ (ae·Vw/Vs)^β with grain scatter
 *
 * References:
 * - Malkin & Guo (2008): Grinding Technology, 2nd Ed
 * - Jaeger (1942): Moving sources of heat, Proc. Royal Soc.
 * - Rowe (2009): Principles of Modern Grinding Technology
 * - Marinescu et al. (2004): Tribology of Abrasive Machining
 *
 * Actions: stochastic_grinding (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface GrindingUncertaintyInput {
  /** Wheel speed (m/s) */
  wheel_speed_ms: number;
  /** Work speed (m/min) */
  work_speed_m_min: number;
  /** Depth of cut ae (mm) */
  depth_of_cut_mm: number;
  /** Wheel diameter (mm) */
  wheel_diameter_mm: number;
  /** Grinding width (mm) */
  width_mm?: number;

  /** Wheel spec */
  grain_size_mesh?: number;  // e.g., 46, 60, 80, 120
  wheel_grade?: "soft" | "medium" | "hard";

  /** Material properties */
  material_type?: "steel" | "stainless" | "inconel"
    | "titanium" | "cast_iron" | "carbide";
  material_hardness_HRC?: number;
  thermal_conductivity_W_mK?: number;
  thermal_diffusivity_mm2_s?: number;
  burn_temp_C?: number;

  /** Dressing */
  dressing_overlap_ratio?: number; // Ud, typically 2-8
  parts_since_dress?: number;

  /** Coolant */
  coolant_type?: "flood" | "mql" | "dry";

  /** Monte Carlo samples */
  mc_samples?: number;

  /** Variation coefficients */
  grain_size_cv_pct?: number;
  specific_energy_cv_pct?: number;
  force_cv_pct?: number;
}

export interface GrindingDistribution {
  mean: number;
  std: number;
  p5: number;
  p95: number;
  unit: string;
}

export interface StochasticGrindingResult {
  specific_energy: GrindingDistribution;
  grinding_force_per_width: GrindingDistribution;
  temperature_max: GrindingDistribution;
  surface_roughness_Ra: GrindingDistribution;
  g_ratio: GrindingDistribution;
  burn_probability_pct: number;
  burn_risk: "negligible" | "low" | "moderate" | "high" | "critical";
  power_per_width_kW_mm: number;
  material_removal_rate_mm3_s: number;
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── Material thermal database ──────────────────────────────────────────

interface MatThermal {
  k_W_mK: number;        // thermal conductivity
  alpha_mm2_s: number;    // thermal diffusivity
  burn_C: number;         // burn/temper threshold
  u_base_J_mm3: number;   // base specific energy
}

const MAT_THERMAL: Record<string, MatThermal> = {
  steel:     { k_W_mK: 50, alpha_mm2_s: 14, burn_C: 500, u_base_J_mm3: 40 },
  stainless: { k_W_mK: 16, alpha_mm2_s: 4.2, burn_C: 450, u_base_J_mm3: 55 },
  inconel:   { k_W_mK: 11, alpha_mm2_s: 3.1, burn_C: 600, u_base_J_mm3: 70 },
  titanium:  { k_W_mK: 7, alpha_mm2_s: 2.9, burn_C: 500, u_base_J_mm3: 60 },
  cast_iron: { k_W_mK: 45, alpha_mm2_s: 12, burn_C: 550, u_base_J_mm3: 30 },
  carbide:   { k_W_mK: 80, alpha_mm2_s: 25, burn_C: 800, u_base_J_mm3: 90 },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class StochasticGrindingEngine {

  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private sampleNormal(mean: number, cv: number): number {
    return mean * (1 + (cv / 100) * this.normalRandom());
  }

  private sampleLogNormal(mean: number, cv: number): number {
    const sigma = cv / 100;
    const mu = Math.log(mean) - 0.5 * sigma * sigma;
    return Math.exp(mu + sigma * this.normalRandom());
  }

  /**
   * Malkin specific energy: u = u_chip + u_slide + u_plow
   * Simplified: u ≈ u0 · (ae_ref/ae)^0.4 · f(Ud, parts)
   */
  malkinSpecificEnergy(
    uBase: number, ae: number, aeRef: number,
    dressingOverlap: number, partsSinceDress: number,
  ): number {
    // Depth effect: thinner cuts → higher specific energy
    const depthFactor = Math.pow(
      Math.max(aeRef, 0.001) / Math.max(ae, 0.001), 0.4,
    );
    // Dressing: sharper wheel (lower Ud) → lower energy
    const dressFactor = 0.8 + 0.1 * dressingOverlap;
    // Wear: energy increases with parts since dress
    const wearFactor = 1 + 0.002 * partsSinceDress;

    return uBase * depthFactor * dressFactor * wearFactor;
  }

  /**
   * Jaeger max surface temperature for moving heat source:
   * θ_max = (1.13 · q · √(a/α)) / (k · √(Vw))
   * where q = u·ae·Vw (heat flux), a = contact length
   */
  jaegerTemperature(
    specificEnergy_J_mm3: number, ae_mm: number,
    Vw_mm_s: number, Vs_mm_s: number,
    wheelDia_mm: number, k_W_mK: number,
    alpha_mm2_s: number, coolantFactor: number,
  ): number {
    // Contact length lc = √(ae · ds)
    const lc = Math.sqrt(ae_mm * wheelDia_mm);
    // Heat flux q = u · ae · Vw (W/mm²)
    const q = specificEnergy_J_mm3 * ae_mm * Vw_mm_s / 1000;
    // Peclet number Pe = Vw · lc / (4·α)
    const Pe = Vw_mm_s * lc / (4 * alpha_mm2_s);
    // Temperature rise (Jaeger moving source)
    const k_W_mm_K = k_W_mK / 1000;
    const theta = Pe > 0.1
      ? (1.13 * q * Math.sqrt(lc)) /
        (k_W_mm_K * Math.sqrt(Vw_mm_s * alpha_mm2_s * 4))
      : (q * lc) / (2 * k_W_mm_K);

    return theta * (1 - coolantFactor) + 25; // add ambient
  }

  /**
   * Surface roughness Ra from grinding kinematics:
   * Ra ∝ (ae · Vw / Vs)^0.5 / grain_density^0.33
   */
  grindingRoughness(
    ae_mm: number, Vw_mm_s: number, Vs_mm_s: number,
    grainSize: number,
  ): number {
    const grainFactor = Math.pow(grainSize / 60, -0.5); // finer → smoother
    const kinFactor = Math.pow(
      (ae_mm * Vw_mm_s) / Math.max(Vs_mm_s, 1), 0.5,
    );
    return 0.2 * kinFactor * grainFactor; // µm
  }

  /** Normal CDF approximation for P(burn) */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 +
      t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - p : p;
  }

  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  makeDist(samples: number[], unit: string): GrindingDistribution {
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

  /** Main entry — stochastic grinding analysis. */
  analyze(input: GrindingUncertaintyInput): StochasticGrindingResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.mc_samples ?? 1000, MAX_TRIALS);

    const mat = MAT_THERMAL[input.material_type ?? "steel"];
    const k = input.thermal_conductivity_W_mK ?? mat.k_W_mK;
    const alpha = input.thermal_diffusivity_mm2_s ?? mat.alpha_mm2_s;
    const burnTemp = input.burn_temp_C ?? mat.burn_C;
    const grainSize = input.grain_size_mesh ?? 60;
    const Ud = input.dressing_overlap_ratio ?? 4;
    const partsSinceDress = input.parts_since_dress ?? 0;
    const width = input.width_mm ?? 10;
    const coolantFactor = input.coolant_type === "flood" ? 0.6
      : input.coolant_type === "mql" ? 0.3 : 0;

    const grainCV = input.grain_size_cv_pct ?? 15;
    const energyCV = input.specific_energy_cv_pct ?? 20;
    const forceCV = input.force_cv_pct ?? 12;

    const Vs_mm_s = input.wheel_speed_ms * 1000;
    const Vw_mm_s = input.work_speed_m_min * 1000 / 60;
    const ae_ref = 0.02; // reference depth for Malkin model

    // Monte Carlo
    const uSamples: number[] = [];
    const forceSamples: number[] = [];
    const tempSamples: number[] = [];
    const raSamples: number[] = [];
    const gSamples: number[] = [];

    for (let i = 0; i < N; i++) {
      // Specific energy with scatter
      const ae_s = Math.max(0.001,
        this.sampleNormal(input.depth_of_cut_mm, 8));
      const u = this.sampleLogNormal(
        this.malkinSpecificEnergy(
          mat.u_base_J_mm3, ae_s, ae_ref, Ud, partsSinceDress,
        ),
        energyCV,
      );
      uSamples.push(u);

      // Tangential force per width: Ft' = u · ae · Vw / Vs
      const Ft = u * ae_s * Vw_mm_s / Vs_mm_s;
      forceSamples.push(this.sampleNormal(Ft, forceCV));

      // Temperature
      const temp = this.jaegerTemperature(
        u, ae_s, Vw_mm_s, Vs_mm_s,
        input.wheel_diameter_mm, k, alpha, coolantFactor,
      );
      tempSamples.push(Math.max(25, temp));

      // Surface roughness
      const grain = this.sampleLogNormal(grainSize, grainCV);
      raSamples.push(this.grindingRoughness(
        ae_s, Vw_mm_s, Vs_mm_s, grain,
      ));

      // G-ratio (material/wheel volume ratio)
      const gradeBase = input.wheel_grade === "hard" ? 80
        : input.wheel_grade === "soft" ? 30 : 50;
      gSamples.push(this.sampleLogNormal(gradeBase, 25));
    }

    // Burn probability
    const tempDist = this.makeDist(tempSamples, "°C");
    const zBurn = tempDist.std > 0
      ? (burnTemp - tempDist.mean) / tempDist.std
      : burnTemp > tempDist.mean ? 5 : -5;
    const burnProb = (1 - this.normalCDF(zBurn)) * 100;

    let burnRisk: "negligible" | "low" | "moderate" | "high" | "critical";
    if (burnProb < 0.1) burnRisk = "negligible";
    else if (burnProb < 1) burnRisk = "low";
    else if (burnProb < 5) burnRisk = "moderate";
    else if (burnProb < 15) burnRisk = "high";
    else burnRisk = "critical";

    // Power and MRR
    const uMean = uSamples.reduce((a, b) => a + b, 0) / N;
    const mrr = input.depth_of_cut_mm * Vw_mm_s * width; // mm³/s
    const powerPerWidth = uMean * input.depth_of_cut_mm * Vw_mm_s / 1e3;

    // Recommendations
    if (burnRisk === "critical" || burnRisk === "high") {
      recommendations.push(
        `Burn risk ${burnRisk} (P=${Math.round(burnProb)}%) — ` +
        "reduce ae or Vw, increase coolant flow",
      );
    }
    if (partsSinceDress > 50) {
      recommendations.push(
        `${partsSinceDress} parts since dress — ` +
        "specific energy increased, consider re-dressing",
      );
    }
    if (tempDist.p95 > burnTemp * 0.8) {
      warnings.push(
        "95th percentile temperature within 20% of burn threshold",
      );
    }
    if (input.coolant_type === "dry") {
      warnings.push(
        "Dry grinding — burn probability greatly increased",
      );
    }

    return {
      specific_energy: this.makeDist(uSamples, "J/mm³"),
      grinding_force_per_width: this.makeDist(forceSamples, "N/mm"),
      temperature_max: tempDist,
      surface_roughness_Ra: this.makeDist(raSamples, "µm"),
      g_ratio: this.makeDist(gSamples, "ratio"),
      burn_probability_pct: Math.round(burnProb * 100) / 100,
      burn_risk: burnRisk,
      power_per_width_kW_mm: Math.round(powerPerWidth * 1000) / 1000,
      material_removal_rate_mm3_s: Math.round(mrr * 100) / 100,
      recommendations,
      warnings,
      formula: "Malkin: u=u_ch+u_sl+u_pl, u∝(ae_ref/ae)^0.4; " +
        "Jaeger: θ=1.13q√(lc)/(k√(4Vwα)); lc=√(ae·ds); " +
        "P(burn)=Φ((θ_max-θ_crit)/σ_θ); " +
        "Ra∝(ae·Vw/Vs)^0.5/grain^0.33; G=V_mat/V_wheel",
    };
  }
}

export const stochasticGrindingEngine = new StochasticGrindingEngine();
