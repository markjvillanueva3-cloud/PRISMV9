/**
 * CeramicsMachiningEngine — Advanced Materials Machining
 *
 * Physics-based ceramic material machining/grinding analysis:
 * - Specific grinding energy model: e = Ft/(b·a·vs)
 * - Fracture mechanics: Kc = Y·σ·√(πa) for micro-fracture assessment
 * - Process recommendation (diamond grinding, USM, laser, EDM)
 *
 * Actions: ceramic_grindability, ceramic_microfracture, ceramic_recommend_process
 */

// ============================================================================
// TYPES
// ============================================================================

export type CeramicMaterial = "alumina" | "zirconia" | "silicon_carbide" | "silicon_nitride" | "dental_porcelain" | "glass_ceramic";
export type WheelType = "diamond_resin" | "diamond_metal" | "diamond_vitrified" | "cbn_vitrified" | "silicon_carbide_wheel";

export interface GrindabilityInput {
  material: CeramicMaterial;
  wheel_type: WheelType;
  depth_mm: number;
  speed_mps: number;
  width_mm?: number;
  table_speed_mpm?: number;
  grit_size?: number;
}

export interface GrindabilityResult {
  specific_energy_J_per_mm3: number;
  surface_damage_depth_mm: number;
  recommended_conditions: {
    speed_mps: number;
    depth_mm: number;
    table_speed_mpm: number;
    wheel_type: string;
  };
  grinding_ratio: number;
  normal_force_N_per_mm: number;
  tangential_force_N_per_mm: number;
  surface_roughness_Ra_um: number;
  thermal_damage_risk: "none" | "low" | "moderate" | "high";
  warnings: string[];
}

export interface MicroFractureInput {
  material: CeramicMaterial;
  applied_stress_MPa: number;
  initial_flaw_size_mm?: number;
  surface_condition?: "as_fired" | "ground" | "lapped" | "polished";
}

export interface MicroFractureResult {
  critical_crack_length_mm: number;
  fracture_probability: number;
  stress_intensity_MPa_sqrt_m: number;
  fracture_toughness_MPa_sqrt_m: number;
  safety_factor: number;
  recommended_tool_tip_radius_mm: number;
  weibull_modulus: number;
  characteristic_strength_MPa: number;
  warnings: string[];
}

export interface ProcessRecommendInput {
  material: CeramicMaterial;
  feature_type: "flat_surface" | "hole" | "slot" | "complex_3d" | "thin_wall" | "thread";
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  thickness_mm?: number;
  production_volume?: "prototype" | "low" | "medium" | "high";
}

export interface ProcessRecommendResult {
  ranked_processes: Array<{
    process: string;
    suitability_score: number;
    achievable_Ra_um: number;
    achievable_tolerance_mm: number;
    mrr_mm3_per_min: number;
    cost_relative: number;
    limitations: string[];
  }>;
  primary_recommendation: string;
  rationale: string;
  warnings: string[];
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface CeramicProps {
  hardness_HV: number;
  fracture_toughness_MPa_sqrt_m: number;
  flexural_strength_MPa: number;
  elastic_modulus_GPa: number;
  thermal_conductivity_W_mK: number;
  density_kg_m3: number;
  /** Weibull modulus — higher = more consistent strength */
  weibull_modulus: number;
  /** Specific grinding energy baseline J/mm³ */
  specific_energy_baseline: number;
  /** Grinding ratio (volume removed / wheel wear) */
  grinding_ratio_baseline: number;
  /** Characteristic strength σ0 for Weibull (MPa) */
  characteristic_strength_MPa: number;
  /** EDM machinability: requires conductivity */
  electrically_conductive: boolean;
}

const CERAMIC_PROPERTIES: Record<CeramicMaterial, CeramicProps> = {
  alumina: {
    hardness_HV: 1800, fracture_toughness_MPa_sqrt_m: 4.0,
    flexural_strength_MPa: 380, elastic_modulus_GPa: 370,
    thermal_conductivity_W_mK: 30, density_kg_m3: 3900,
    weibull_modulus: 10, specific_energy_baseline: 40,
    grinding_ratio_baseline: 5, characteristic_strength_MPa: 400,
    electrically_conductive: false,
  },
  zirconia: {
    hardness_HV: 1300, fracture_toughness_MPa_sqrt_m: 8.0,
    flexural_strength_MPa: 1000, elastic_modulus_GPa: 210,
    thermal_conductivity_W_mK: 2, density_kg_m3: 6050,
    weibull_modulus: 15, specific_energy_baseline: 30,
    grinding_ratio_baseline: 8, characteristic_strength_MPa: 1100,
    electrically_conductive: false,
  },
  silicon_carbide: {
    hardness_HV: 2500, fracture_toughness_MPa_sqrt_m: 3.5,
    flexural_strength_MPa: 450, elastic_modulus_GPa: 410,
    thermal_conductivity_W_mK: 120, density_kg_m3: 3210,
    weibull_modulus: 12, specific_energy_baseline: 60,
    grinding_ratio_baseline: 3, characteristic_strength_MPa: 500,
    electrically_conductive: true, // sintered SiC can be conductive
  },
  silicon_nitride: {
    hardness_HV: 1600, fracture_toughness_MPa_sqrt_m: 6.5,
    flexural_strength_MPa: 800, elastic_modulus_GPa: 310,
    thermal_conductivity_W_mK: 25, density_kg_m3: 3200,
    weibull_modulus: 18, specific_energy_baseline: 35,
    grinding_ratio_baseline: 6, characteristic_strength_MPa: 900,
    electrically_conductive: false,
  },
  dental_porcelain: {
    hardness_HV: 700, fracture_toughness_MPa_sqrt_m: 1.2,
    flexural_strength_MPa: 120, elastic_modulus_GPa: 70,
    thermal_conductivity_W_mK: 1.5, density_kg_m3: 2500,
    weibull_modulus: 8, specific_energy_baseline: 15,
    grinding_ratio_baseline: 15, characteristic_strength_MPa: 140,
    electrically_conductive: false,
  },
  glass_ceramic: {
    hardness_HV: 800, fracture_toughness_MPa_sqrt_m: 2.5,
    flexural_strength_MPa: 250, elastic_modulus_GPa: 90,
    thermal_conductivity_W_mK: 2.5, density_kg_m3: 2600,
    weibull_modulus: 12, specific_energy_baseline: 20,
    grinding_ratio_baseline: 12, characteristic_strength_MPa: 280,
    electrically_conductive: false,
  },
};

// Wheel effectiveness multipliers
const WHEEL_EFFECTIVENESS: Record<WheelType, { energy_factor: number; ratio_factor: number; Ra_factor: number }> = {
  diamond_resin:     { energy_factor: 0.7,  ratio_factor: 1.2,  Ra_factor: 0.8 },
  diamond_metal:     { energy_factor: 0.8,  ratio_factor: 0.8,  Ra_factor: 1.2 },
  diamond_vitrified: { energy_factor: 0.75, ratio_factor: 1.5,  Ra_factor: 0.7 },
  cbn_vitrified:     { energy_factor: 1.1,  ratio_factor: 0.6,  Ra_factor: 1.0 },
  silicon_carbide_wheel: { energy_factor: 1.5, ratio_factor: 0.3, Ra_factor: 1.5 },
};

// ============================================================================
// ENGINE
// ============================================================================

export class CeramicsMachiningEngine {
  /**
   * Analyze grindability using specific grinding energy model.
   * e = Ft / (b · a · vs) where Ft = tangential force, b = width, a = depth, vs = table speed
   */
  analyzeGrindability(input: GrindabilityInput): GrindabilityResult {
    const mat = CERAMIC_PROPERTIES[input.material];
    const wheel = WHEEL_EFFECTIVENESS[input.wheel_type];
    const warnings: string[] = [];

    const b = input.width_mm ?? 10; // grinding width mm
    const a = input.depth_mm; // depth of cut mm
    const vs = input.speed_mps; // wheel speed m/s
    const vw = input.table_speed_mpm ?? 15; // table/workpiece speed m/min
    const grit = input.grit_size ?? 120;

    // Specific grinding energy: depends on material, wheel, and conditions
    // Base energy scales with hardness and inversely with depth (size effect)
    const size_effect = Math.pow(0.01 / Math.max(a, 0.001), 0.3); // smaller cuts = higher specific energy
    const grit_factor = Math.pow(grit / 120, 0.2); // finer grit = higher energy
    const speed_factor = Math.pow(vs / 30, -0.15); // higher wheel speed slightly reduces energy
    const specific_energy = mat.specific_energy_baseline * wheel.energy_factor * size_effect * grit_factor * speed_factor;

    // Forces: from specific energy
    // Ft = e · b · a · vw / vs (tangential force per unit width)
    const vw_ms = vw / 60;
    const Ft_per_mm = specific_energy * a * vw_ms / vs;
    const Fn_per_mm = Ft_per_mm * (2.0 + mat.hardness_HV / 2000); // F_n/F_t ratio ~2-4 for ceramics

    // Grinding ratio (G-ratio)
    const grinding_ratio = mat.grinding_ratio_baseline * wheel.ratio_factor * Math.pow(vs / 30, 0.3);

    // Surface roughness: Ra ≈ f(grit, depth, wheel speed)
    // Empirical: Ra ∝ (a · vw / vs)^0.4 / grit^0.5
    const Ra_base = 0.8; // μm baseline for standard conditions
    const Ra = Ra_base * Math.pow((a * vw_ms) / (0.01 * 0.25), 0.4) * Math.pow(120 / grit, 0.5) * wheel.Ra_factor;

    // Surface damage depth: subsurface cracking from grinding forces
    // Median crack depth ∝ (Fn/Kc)^(2/3) · (E/H)^(1/2) — indentation fracture model
    const Fn_total = Fn_per_mm * b;
    const damage_depth = 0.01 * Math.pow(Fn_total / (mat.fracture_toughness_MPa_sqrt_m * 1000), 2 / 3)
      * Math.pow(mat.elastic_modulus_GPa / (mat.hardness_HV * 0.01), 0.5);

    // Thermal damage assessment
    // Grinding temperature ∝ e · a · vw / k
    const temp_index = specific_energy * a * vw_ms / mat.thermal_conductivity_W_mK;
    let thermal_risk: GrindabilityResult["thermal_damage_risk"];
    if (temp_index < 0.5) thermal_risk = "none";
    else if (temp_index < 2) thermal_risk = "low";
    else if (temp_index < 5) thermal_risk = "moderate";
    else thermal_risk = "high";

    // Recommended conditions
    const rec_speed = input.material === "silicon_carbide" ? 35 : 30; // m/s
    const rec_depth = mat.fracture_toughness_MPa_sqrt_m > 5 ? 0.02 : 0.01; // mm
    const rec_table = 12; // m/min
    const rec_wheel = mat.hardness_HV > 2000 ? "diamond_metal" : "diamond_resin";

    if (input.wheel_type === "silicon_carbide_wheel" && mat.hardness_HV > 1500) {
      warnings.push("SiC wheel is not effective for high-hardness ceramics — use diamond wheel");
    }
    if (input.wheel_type === "cbn_vitrified" && mat.hardness_HV > 2000) {
      warnings.push("CBN less effective than diamond for very hard ceramics (>2000 HV)");
    }
    if (thermal_risk === "high") {
      warnings.push("High thermal damage risk — reduce depth of cut or increase coolant flow");
    }
    if (damage_depth > 0.05) {
      warnings.push(`Subsurface damage depth ${(damage_depth * 1000).toFixed(0)} μm — may require lapping to remove`);
    }

    return {
      specific_energy_J_per_mm3: Math.round(specific_energy * 100) / 100,
      surface_damage_depth_mm: Math.round(damage_depth * 10000) / 10000,
      recommended_conditions: {
        speed_mps: rec_speed,
        depth_mm: rec_depth,
        table_speed_mpm: rec_table,
        wheel_type: rec_wheel,
      },
      grinding_ratio: Math.round(grinding_ratio * 10) / 10,
      normal_force_N_per_mm: Math.round(Fn_per_mm * 100) / 100,
      tangential_force_N_per_mm: Math.round(Ft_per_mm * 10000) / 10000,
      surface_roughness_Ra_um: Math.round(Ra * 100) / 100,
      thermal_damage_risk: thermal_risk,
      warnings,
    };
  }

  /**
   * Assess micro-fracture risk using linear elastic fracture mechanics.
   * K_I = Y · σ · √(π · a)
   * Failure when K_I >= K_Ic (fracture toughness)
   */
  assessMicroFracture(input: MicroFractureInput): MicroFractureResult {
    const mat = CERAMIC_PROPERTIES[input.material];
    const warnings: string[] = [];

    // Initial flaw size depends on surface condition
    const flaw_sizes: Record<string, number> = {
      as_fired: 0.2,   // mm — large flaws from sintering
      ground: 0.05,    // mm — grinding-induced cracks
      lapped: 0.02,    // mm — smaller flaws
      polished: 0.005, // mm — minimal surface flaws
    };
    const surface = input.surface_condition ?? "ground";
    const a_init = input.initial_flaw_size_mm ?? flaw_sizes[surface];

    // Geometry factor Y for semi-elliptical surface crack
    const Y = 1.12; // standard value for surface crack

    // Stress intensity factor: K_I = Y · σ · √(π · a)
    const K_I = Y * input.applied_stress_MPa * Math.sqrt(Math.PI * a_init * 1e-3); // MPa·√m

    const K_Ic = mat.fracture_toughness_MPa_sqrt_m;

    // Critical crack length: a_c = (K_Ic / (Y · σ))² / π
    const critical_crack = (K_Ic / (Y * Math.max(input.applied_stress_MPa, 1))) ** 2 / Math.PI * 1000; // mm

    // Safety factor
    const safety_factor = K_Ic / Math.max(K_I, 1e-6);

    // Fracture probability using Weibull statistics
    // P_f = 1 - exp(-(σ/σ0)^m)
    const m_w = mat.weibull_modulus;
    const sigma_0 = mat.characteristic_strength_MPa;
    const fracture_prob = 1 - Math.exp(-Math.pow(input.applied_stress_MPa / sigma_0, m_w));

    // Recommended tool tip radius to avoid inducing fracture
    // Hertzian contact: p_max = (6·F·E²/(π³·R²))^(1/3)
    // Larger radius → lower contact stress → less fracture
    const min_tip_radius = 0.5 * Math.pow(input.applied_stress_MPa / mat.flexural_strength_MPa, 2);

    if (safety_factor < 1.0) {
      warnings.push("FAILURE: Stress intensity exceeds fracture toughness — crack will propagate");
    } else if (safety_factor < 2.0) {
      warnings.push("Low safety factor — consider reducing load or improving surface finish");
    }
    if (fracture_prob > 0.1) {
      warnings.push(`Fracture probability ${(fracture_prob * 100).toFixed(1)}% exceeds 10% — reduce stress or improve surface`);
    }
    if (surface === "as_fired") {
      warnings.push("As-fired surface has large inherent flaws — grinding recommended for structural applications");
    }

    return {
      critical_crack_length_mm: Math.round(critical_crack * 1000) / 1000,
      fracture_probability: Math.round(fracture_prob * 10000) / 10000,
      stress_intensity_MPa_sqrt_m: Math.round(K_I * 1000) / 1000,
      fracture_toughness_MPa_sqrt_m: K_Ic,
      safety_factor: Math.round(safety_factor * 100) / 100,
      recommended_tool_tip_radius_mm: Math.round(Math.max(min_tip_radius, 0.1) * 100) / 100,
      weibull_modulus: m_w,
      characteristic_strength_MPa: sigma_0,
      warnings,
    };
  }

  /**
   * Recommend best machining process for given ceramic + geometry.
   * Ranks: diamond grinding, USM (ultrasonic machining), laser, EDM.
   */
  recommendProcess(input: ProcessRecommendInput): ProcessRecommendResult {
    const mat = CERAMIC_PROPERTIES[input.material];
    const warnings: string[] = [];
    const tolerance = input.tolerance_mm ?? 0.05;
    const Ra_target = input.surface_finish_Ra_um ?? 1.6;
    const thickness = input.thickness_mm ?? 10;
    const volume = input.production_volume ?? "low";

    interface ProcessCandidate {
      process: string;
      base_score: number;
      Ra_achievable: number;
      tolerance_achievable: number;
      mrr_mm3_min: number;
      cost_relative: number;
      limitations: string[];
    }

    const candidates: ProcessCandidate[] = [];

    // 1. Diamond grinding — universal for ceramics
    const grinding_mrr = 50 / (mat.hardness_HV / 1000); // mm³/min, inversely proportional to hardness
    candidates.push({
      process: "Diamond grinding",
      base_score: 0.8,
      Ra_achievable: 0.2,
      tolerance_achievable: 0.005,
      mrr_mm3_min: grinding_mrr,
      cost_relative: 1.0,
      limitations: this._grindingLimitations(input.feature_type, mat),
    });

    // 2. Ultrasonic machining (USM) — good for brittle ceramics, complex features
    const usm_mrr = 10 * (mat.fracture_toughness_MPa_sqrt_m < 5 ? 1.5 : 0.8); // brittle = faster USM
    candidates.push({
      process: "Ultrasonic machining (USM)",
      base_score: 0.6,
      Ra_achievable: 0.4,
      tolerance_achievable: 0.01,
      mrr_mm3_min: usm_mrr,
      cost_relative: 1.5,
      limitations: ["Slow material removal rate", "Tool (sonotrode) wear is significant", "Limited depth capability (< 50 mm)"],
    });

    // 3. Laser machining
    const laser_mrr = 5; // mm³/min typical for ceramics
    candidates.push({
      process: "Laser machining (Nd:YAG/fiber)",
      base_score: 0.5,
      Ra_achievable: 2.0,
      tolerance_achievable: 0.02,
      mrr_mm3_min: laser_mrr,
      cost_relative: 2.0,
      limitations: [
        "Heat-affected zone (HAZ) can cause micro-cracking",
        "Limited depth per pass",
        "Surface recast layer requires post-processing",
        mat.thermal_conductivity_W_mK < 5 ? "Low thermal conductivity increases HAZ risk" : "Good thermal conductivity helps dissipate heat",
      ],
    });

    // 4. EDM — only for conductive ceramics
    if (mat.electrically_conductive) {
      candidates.push({
        process: "Electrical Discharge Machining (EDM)",
        base_score: 0.7,
        Ra_achievable: 0.8,
        tolerance_achievable: 0.005,
        mrr_mm3_min: 15,
        cost_relative: 1.3,
        limitations: ["Only for electrically conductive ceramics", "Surface recast layer", "Electrode wear"],
      });
    }

    // 5. Lapping/polishing — for ultra-fine finish
    if (Ra_target < 0.1) {
      candidates.push({
        process: "Lapping and polishing",
        base_score: 0.4,
        Ra_achievable: 0.01,
        tolerance_achievable: 0.001,
        mrr_mm3_min: 0.5,
        cost_relative: 3.0,
        limitations: ["Extremely slow", "Flat/simple geometries only", "High labor cost"],
      });
    }

    // Score each candidate
    const scored = candidates.map(c => {
      let score = c.base_score;

      // Feature type suitability
      if (input.feature_type === "hole" && c.process.includes("USM")) score += 0.3;
      if (input.feature_type === "hole" && c.process.includes("Laser")) score += 0.15;
      if (input.feature_type === "complex_3d" && c.process.includes("USM")) score += 0.2;
      if (input.feature_type === "complex_3d" && c.process.includes("Laser")) score += 0.2;
      if (input.feature_type === "flat_surface" && c.process.includes("grinding")) score += 0.2;
      if (input.feature_type === "slot" && c.process.includes("grinding")) score += 0.15;
      if (input.feature_type === "thin_wall" && c.process.includes("USM")) score -= 0.3; // fragile
      if (input.feature_type === "thin_wall" && c.process.includes("Laser")) score += 0.1;

      // Tolerance achievability
      if (c.tolerance_achievable <= tolerance) score += 0.15;
      else score -= 0.3;

      // Surface finish achievability
      if (c.Ra_achievable <= Ra_target) score += 0.15;
      else score -= 0.2;

      // Production volume
      if (volume === "high" && c.mrr_mm3_min > 20) score += 0.15;
      if (volume === "prototype" && c.cost_relative < 1.5) score += 0.1;

      // Thin wall caution
      if (input.feature_type === "thin_wall" && thickness < 2) {
        if (c.process.includes("grinding")) score -= 0.1;
      }

      return {
        process: c.process,
        suitability_score: Math.round(Math.max(0, Math.min(1, score)) * 100) / 100,
        achievable_Ra_um: c.Ra_achievable,
        achievable_tolerance_mm: c.tolerance_achievable,
        mrr_mm3_per_min: Math.round(c.mrr_mm3_min * 10) / 10,
        cost_relative: c.cost_relative,
        limitations: c.limitations,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.suitability_score - a.suitability_score);

    const primary = scored[0];
    let rationale = `${primary.process} is recommended for ${input.material} ${input.feature_type}.`;
    if (primary.achievable_Ra_um <= Ra_target) {
      rationale += ` Achieves target Ra ${Ra_target} μm (capable of ${primary.achievable_Ra_um} μm).`;
    }
    if (primary.achievable_tolerance_mm <= tolerance) {
      rationale += ` Meets tolerance ±${tolerance} mm.`;
    }

    if (input.feature_type === "thin_wall" && thickness < 1) {
      warnings.push("Thin wall (<1 mm) in ceramic is extremely fragile — consider redesign");
    }
    if (!mat.electrically_conductive && input.feature_type === "complex_3d") {
      warnings.push("Non-conductive ceramic limits process options — EDM not available");
    }

    return {
      ranked_processes: scored,
      primary_recommendation: primary.process,
      rationale,
      warnings,
    };
  }

  /**
   * Bayesian-updated fracture assessment from observed strength data.
   *
   * Ceramics have inherent scatter in strength (Weibull distribution). When
   * actual fracture test data is available from a batch, this method uses
   * BayesianWearModel to update the characteristic strength σ₀ posterior,
   * giving a tighter fracture probability estimate than the catalog value.
   *
   * Learning loop: test 5-10 samples → measure fracture strengths →
   * this method narrows σ₀ → assessMicroFracture uses updated strength.
   *
   * Lazy-requires BayesianWearModel; falls back to assessMicroFracture() if unavailable.
   *
   * Reference: Weibull (1951); ASTM C1161 flexural strength testing;
   *            Playbook: CBN/ceramic guidance for brittle materials
   */
  assessWithBayesian(input: MicroFractureInput & {
    observed_strengths?: number[];
  }): MicroFractureResult & {
    bayesian_model_used: boolean;
    posterior_strength_mean: number | null;
    posterior_strength_std: number | null;
    updated_fracture_probability: number | null;
    updated_safety_factor: number | null;
  } {
    const baseResult = this.assessMicroFracture(input);
    const mat = CERAMIC_PROPERTIES[input.material];
    const observed = input.observed_strengths;

    if (!observed || observed.length === 0) {
      return {
        ...baseResult,
        bayesian_model_used: false,
        posterior_strength_mean: null,
        posterior_strength_std: null,
        updated_fracture_probability: null,
        updated_safety_factor: null,
      };
    }

    let bayesianUsed = false;
    let postMean: number | null = null;
    let postStd: number | null = null;
    let updatedFracProb: number | null = null;
    let updatedSF: number | null = null;

    try {
      const { BayesianWearModel } = require("../algorithms/BayesianWearModel.js");
      const bwm = new BayesianWearModel();

      // Prior: catalog characteristic strength ± 15% CV (typical for ceramics)
      const priorMean = mat.characteristic_strength_MPa;
      const priorStd = priorMean * 0.15;

      const bmResult = bwm.calculate({
        prior_mean: priorMean,
        prior_std: priorStd,
        observations: observed,
        likelihood_std: priorStd,
        vb_threshold: input.applied_stress_MPa, // threshold = applied stress
      });

      bayesianUsed = true;
      postMean = bmResult.posterior_mean;
      postStd = bmResult.posterior_std;

      // Updated Weibull fracture probability with posterior σ₀
      // P_f = 1 - exp(-(σ/σ₀_posterior)^m)
      const postMeanVal = bmResult.posterior_mean as number;
      postMean = postMeanVal;
      const m_w = mat.weibull_modulus;
      updatedFracProb = 1 - Math.exp(
        -Math.pow(input.applied_stress_MPa / postMeanVal, m_w)
      );

      // Updated safety factor from posterior K_Ic estimate
      // Scale K_Ic proportionally to strength change
      const strengthRatio = postMeanVal / priorMean;
      const updatedKIc = mat.fracture_toughness_MPa_sqrt_m * strengthRatio;
      const Y = 1.12;
      const flaw = input.initial_flaw_size_mm
        ?? ({ as_fired: 0.2, ground: 0.05, lapped: 0.02, polished: 0.005 } as Record<string, number>)[input.surface_condition ?? "ground"]
        ?? 0.05;
      const K_I = Y * input.applied_stress_MPa * Math.sqrt(Math.PI * flaw * 1e-3);
      updatedSF = updatedKIc / Math.max(K_I, 1e-6);
    } catch {
      // Fallback: simple mean of observations
      const obsMean = observed.reduce((s, v) => s + v, 0) / observed.length;
      postMean = obsMean;
      const m_w = mat.weibull_modulus;
      updatedFracProb = 1 - Math.exp(
        -Math.pow(input.applied_stress_MPa / obsMean, m_w)
      );
      // Compute fallback safety factor from observed strength ratio
      const strengthRatioFB = obsMean / mat.characteristic_strength_MPa;
      const updatedKIcFB = mat.fracture_toughness_MPa_sqrt_m * strengthRatioFB;
      const Y_fb = 1.12;
      const flawFB = input.initial_flaw_size_mm
        ?? ({ as_fired: 0.2, ground: 0.05, lapped: 0.02, polished: 0.005 } as Record<string, number>)[input.surface_condition ?? "ground"]
        ?? 0.05;
      const K_I_fb = Y_fb * input.applied_stress_MPa * Math.sqrt(Math.PI * flawFB * 1e-3);
      updatedSF = updatedKIcFB / Math.max(K_I_fb, 1e-6);
    }

    return {
      ...baseResult,
      bayesian_model_used: bayesianUsed,
      posterior_strength_mean: postMean !== null
        ? Math.round(postMean * 10) / 10 : null,
      posterior_strength_std: postStd !== null
        ? Math.round(postStd * 10) / 10 : null,
      updated_fracture_probability: updatedFracProb !== null
        ? Math.round(updatedFracProb * 10000) / 10000 : null,
      updated_safety_factor: updatedSF !== null
        ? Math.round(updatedSF * 100) / 100 : null,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _grindingLimitations(feature: string, mat: CeramicProps): string[] {
    const lims: string[] = [];
    if (feature === "complex_3d") lims.push("Limited to simple geometries without 5-axis capability");
    if (feature === "hole") lims.push("Internal grinding requires small-diameter wheel — slower");
    if (mat.hardness_HV > 2000) lims.push("Very high hardness increases wheel wear and cost");
    if (mat.fracture_toughness_MPa_sqrt_m < 3) lims.push("Low toughness — risk of chipping at edges");
    return lims;
  }
}

/** Singleton instance */
export const ceramicsMachiningEngine = new CeramicsMachiningEngine();
