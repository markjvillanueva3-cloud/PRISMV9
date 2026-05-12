/**
 * LatheUnifiedScienceEngine.ts — Unified Physics/Chemistry/Metallurgy/Thermodynamics
 * ===================================================================================
 *
 * PhD-level integration of all scientific domains for lathe cutting processes.
 * Orchestrates: Kienzle forces, Taylor tool life, thermal analysis, metallurgical
 * effects, cutting chemistry, chip mechanics, and deflection dynamics.
 *
 * @module engines/LatheUnifiedScienceEngine
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Material properties for unified analysis
 */
export interface MaterialProperties {
  iso_group: ISOGroup;
  hardness_hrc?: number;
  hardness_hb?: number;
  tensile_strength_mpa?: number;
  thermal_conductivity_w_mk: number;
  specific_heat_j_kg_k: number;
  density_kg_m3: number;
  melting_point_c: number;
  work_hardening_exponent?: number;
  thermal_expansion_coeff?: number;
}

/**
 * Cutting parameters
 */
export interface CuttingParameters {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  rake_angle_deg?: number;
  relief_angle_deg?: number;
  nose_radius_mm?: number;
  tool_material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  coating?: "uncoated" | "TiN" | "TiCN" | "TiAlN" | "Al2O3" | "CVD" | "PVD";
  coolant?: "none" | "flood" | "mist" | "mql" | "cryogenic";
}

/**
 * Tool geometry
 */
export interface ToolGeometry {
  overhang_mm: number;
  shank_diameter_mm?: number;
  bar_diameter_mm?: number;
  modulus_gpa?: number;
  moment_of_inertia_mm4?: number;
}

/**
 * Unified science analysis result
 */
export interface UnifiedScienceResult {
  // Kienzle force analysis
  forces: {
    cutting_force_N: number;
    thrust_force_N: number;
    feed_force_N: number;
    resultant_force_N: number;
    specific_cutting_force_N_mm2: number;
    power_kW: number;
    torque_Nm: number;
    uncertainty_pct: number;
    source: string;
  };

  // Taylor tool life
  tool_life: {
    tool_life_min: number;
    optimal_speed_m_min: number;
    wear_rate_mm_per_min: number;
    dominant_wear_mechanism: string;
    confidence: number;
    source: string;
  };

  // Thermal analysis
  thermal: {
    chip_temperature_C: number;
    tool_interface_temperature_C: number;
    workpiece_surface_temperature_C: number;
    heat_partition: {
      chip_pct: number;
      tool_pct: number;
      workpiece_pct: number;
      coolant_pct: number;
    };
    thermal_softening_factor: number;
    coating_safe: boolean;
    white_layer_risk: boolean;
    source: string;
  };

  // Metallurgical effects
  metallurgy: {
    work_hardening_factor: number;
    residual_stress_type: "tensile" | "compressive" | "mixed";
    surface_hardness_change_pct: number;
    phase_transformation_risk: boolean;
    tempering_risk: boolean;
    recommendations: string[];
    source: string;
  };

  // Chemistry effects
  chemistry: {
    bue_risk: boolean;
    diffusion_wear_risk: boolean;
    coolant_compatible: boolean;
    oxidation_layer_expected: boolean;
    chemical_wear_rate_modifier: number;
    recommendations: string[];
    source: string;
  };

  // Chip mechanics
  chip: {
    chip_type: "continuous" | "segmented" | "discontinuous" | "bue_affected";
    shear_angle_deg: number;
    chip_thickness_ratio: number;
    chip_curl_radius_mm: number;
    chip_breaking_expected: boolean;
    chip_control_recommendations: string[];
    source: string;
  };

  // Deflection dynamics
  deflection: {
    tool_deflection_mm: number;
    workpiece_deflection_mm: number;
    total_deflection_mm: number;
    chatter_risk: "low" | "medium" | "high" | "critical";
    dominant_mode: "tool" | "workpiece" | "combined";
    recommendations: string[];
    source: string;
  };

  // Surface quality prediction
  surface: {
    theoretical_ra_um: number;
    predicted_ra_um: number;
    rz_um: number;
    surface_integrity_score: number;
    limiting_factor: string;
    source: string;
  };

  // Overall assessment
  overall: {
    process_score: number;
    limiting_factors: string[];
    optimization_recommendations: string[];
    safety_warnings: string[];
    confidence: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Unified science engine for lathe cutting analysis
 */
export class LatheUnifiedScienceEngine {
  private readonly version = "1.0.0";

  /**
   * Perform complete unified science analysis
   */
  public analyze(
    material: MaterialProperties,
    params: CuttingParameters,
    toolGeometry?: ToolGeometry,
    workpiece?: { diameter_mm: number; length_mm: number; wall_thickness_mm?: number }
  ): UnifiedScienceResult {
    // Get Kienzle constants for material
    const kienzle = CANONICAL_KIENZLE[material.iso_group];
    const taylor = CANONICAL_TAYLOR[material.iso_group];

    // 1. Force analysis (Kienzle)
    const forces = this.analyzeForces(material, params, kienzle);

    // 2. Tool life analysis (Taylor)
    const toolLife = this.analyzeToolLife(material, params, taylor);

    // 3. Thermal analysis
    const thermal = this.analyzeThermal(material, params, forces.cutting_force_N);

    // 4. Metallurgical effects
    const metallurgy = this.analyzeMetallurgy(material, thermal);

    // 5. Chemistry effects
    const chemistry = this.analyzeChemistry(material, params, thermal);

    // 6. Chip mechanics
    const chip = this.analyzeChipMechanics(material, params, thermal);

    // 7. Deflection dynamics
    const deflection = this.analyzeDeflection(
      forces.resultant_force_N,
      toolGeometry,
      workpiece
    );

    // 8. Surface quality
    const surface = this.analyzeSurface(params, deflection, chip);

    // 9. Overall assessment
    const overall = this.computeOverallAssessment({
      forces,
      toolLife,
      thermal,
      metallurgy,
      chemistry,
      chip,
      deflection,
      surface,
    });

    return {
      forces,
      tool_life: toolLife,
      thermal,
      metallurgy,
      chemistry,
      chip,
      deflection,
      surface,
      overall,
    };
  }

  /**
   * Kienzle force analysis
   */
  private analyzeForces(
    material: MaterialProperties,
    params: CuttingParameters,
    kienzle: { kc1_1: number; mc: number }
  ): UnifiedScienceResult["forces"] {
    const { cutting_speed_m_min, feed_mm_rev, depth_of_cut_mm } = params;
    const { kc1_1, mc } = kienzle;

    // Main cutting force: Fc = kc1.1 * ap * f^(1-mc)
    const h = feed_mm_rev; // chip thickness ≈ feed for turning
    const kc = kc1_1 * Math.pow(h, -mc); // specific cutting force
    const Fc = kc * depth_of_cut_mm * feed_mm_rev;

    // Thrust and feed forces (empirical ratios)
    const Ft = Fc * 0.4; // thrust ≈ 40% of cutting
    const Ff = Fc * 0.25; // feed ≈ 25% of cutting

    // Resultant
    const Fr = Math.sqrt(Fc * Fc + Ft * Ft + Ff * Ff);

    // Power and torque
    const Pc = (Fc * cutting_speed_m_min) / 60000; // kW
    const torque = (Fc * 50) / 2000; // assume 50mm workpiece diameter

    // Uncertainty from Kienzle model
    const uncertainty = 0.15; // 15% typical

    return {
      cutting_force_N: Fc,
      thrust_force_N: Ft,
      feed_force_N: Ff,
      resultant_force_N: Fr,
      specific_cutting_force_N_mm2: kc,
      power_kW: Pc,
      torque_Nm: torque,
      uncertainty_pct: uncertainty * 100,
      source: "Kienzle (1952)",
    };
  }

  /**
   * Taylor tool life analysis
   */
  private analyzeToolLife(
    material: MaterialProperties,
    params: CuttingParameters,
    taylor: { C: number; n: number }
  ): UnifiedScienceResult["tool_life"] {
    const { cutting_speed_m_min, feed_mm_rev, depth_of_cut_mm } = params;
    const { C, n } = taylor;

    // Taylor equation: T = (C/Vc)^(1/n)
    const T = Math.pow(C / cutting_speed_m_min, 1 / n);

    // Optimal speed for 30 min tool life
    const T_target = 30;
    const Vc_optimal = C / Math.pow(T_target, n);

    // Wear rate (simplified)
    const VB_limit = 0.3; // mm flank wear limit
    const wear_rate = VB_limit / T;

    // Dominant wear mechanism based on speed and material
    let dominant_wear = "flank_wear";
    if (cutting_speed_m_min > 200 && material.iso_group === "S") {
      dominant_wear = "diffusion_wear";
    } else if (cutting_speed_m_min < 30) {
      dominant_wear = "adhesion_wear";
    } else if (material.hardness_hrc && material.hardness_hrc > 50) {
      dominant_wear = "abrasion_wear";
    }

    return {
      tool_life_min: T,
      optimal_speed_m_min: Vc_optimal,
      wear_rate_mm_per_min: wear_rate,
      dominant_wear_mechanism: dominant_wear,
      confidence: 0.85,
      source: "Taylor (1907), ISO 3685",
    };
  }

  /**
   * Thermal analysis
   */
  private analyzeThermal(
    material: MaterialProperties,
    params: CuttingParameters,
    Fc: number
  ): UnifiedScienceResult["thermal"] {
    const { cutting_speed_m_min, coolant } = params;

    // Heat generation: Q = Fc * Vc
    const Q = Fc * (cutting_speed_m_min / 60); // W

    // Chip temperature estimate (empirical)
    // Higher speed = higher chip temp but more heat carried away
    const T_chip =
      200 +
      (cutting_speed_m_min / 4) * (1 - material.thermal_conductivity_w_mk / 100);

    // Tool interface temperature
    const T_interface = T_chip * 0.8;

    // Workpiece surface temperature
    const T_workpiece = 50 + T_chip * 0.15;

    // Heat partition
    let chip_pct = 0.6 + 0.15 * (cutting_speed_m_min / 300);
    let coolant_pct = 0;
    if (coolant === "flood") coolant_pct = 0.15;
    else if (coolant === "cryogenic") coolant_pct = 0.25;
    else if (coolant === "mql") coolant_pct = 0.05;
    else if (coolant === "mist") coolant_pct = 0.08;

    chip_pct = Math.min(0.85, chip_pct);
    const remaining = 1 - chip_pct - coolant_pct;
    const tool_pct = remaining * 0.6;
    const workpiece_pct = remaining * 0.4;

    // Thermal softening factor (Johnson-Cook T* term simplified)
    const T_melt = material.melting_point_c;
    const T_room = 25;
    const T_star = (T_chip - T_room) / (T_melt - T_room);
    const thermal_softening = 1 - Math.pow(T_star, 1.0); // m=1 approximation

    // Coating temperature limits
    const coating_limits: Record<string, number> = {
      uncoated: 600,
      TiN: 500,
      TiCN: 450,
      TiAlN: 800,
      Al2O3: 1200,
      CVD: 1000,
      PVD: 700,
    };
    const coating_limit = coating_limits[params.coating || "uncoated"] || 600;
    const coating_safe = T_interface < coating_limit;

    // White layer risk (hardened steel at high speed)
    const white_layer_risk =
      material.hardness_hrc !== undefined &&
      material.hardness_hrc > 50 &&
      cutting_speed_m_min > 180;

    return {
      chip_temperature_C: T_chip,
      tool_interface_temperature_C: T_interface,
      workpiece_surface_temperature_C: T_workpiece,
      heat_partition: {
        chip_pct: chip_pct * 100,
        tool_pct: tool_pct * 100,
        workpiece_pct: workpiece_pct * 100,
        coolant_pct: coolant_pct * 100,
      },
      thermal_softening_factor: thermal_softening,
      coating_safe,
      white_layer_risk,
      source: "Jaeger heat source model, Shaw Metal Cutting Principles",
    };
  }

  /**
   * Metallurgical effects analysis
   */
  private analyzeMetallurgy(
    material: MaterialProperties,
    thermal: UnifiedScienceResult["thermal"]
  ): UnifiedScienceResult["metallurgy"] {
    const recommendations: string[] = [];

    // Work hardening (austenitic stainless, Inconel)
    let work_hardening_factor = 1.0;
    if (
      material.iso_group === "M" ||
      (material.work_hardening_exponent && material.work_hardening_exponent > 0.3)
    ) {
      work_hardening_factor = 1.3;
      recommendations.push(
        "Material work hardens severely - maintain positive chip load, avoid rubbing"
      );
    }

    // Residual stress
    let residual_stress: "tensile" | "compressive" | "mixed" = "tensile";
    if (thermal.chip_temperature_C < 200) {
      residual_stress = "mixed";
    }

    // Surface hardness change
    let hardness_change_pct = 0;
    if (thermal.white_layer_risk) {
      hardness_change_pct = 30;
      recommendations.push(
        "White layer formation risk - may cause surface hardening and reduced fatigue life"
      );
    }

    // Phase transformation risk (steel near Ac1 temp ~727°C)
    const phase_risk =
      material.iso_group === "P" && thermal.chip_temperature_C > 600;

    // Tempering risk (hardened steel)
    const tempering_risk =
      material.hardness_hrc !== undefined &&
      material.hardness_hrc > 40 &&
      thermal.workpiece_surface_temperature_C > 300;

    if (tempering_risk) {
      recommendations.push(
        "Tempering risk on hardened surface - reduce speed or increase coolant"
      );
    }

    return {
      work_hardening_factor,
      residual_stress_type: residual_stress,
      surface_hardness_change_pct: hardness_change_pct,
      phase_transformation_risk: phase_risk,
      tempering_risk,
      recommendations,
      source: "Surface integrity metallurgy",
    };
  }

  /**
   * Chemistry effects analysis
   */
  private analyzeChemistry(
    material: MaterialProperties,
    params: CuttingParameters,
    thermal: UnifiedScienceResult["thermal"]
  ): UnifiedScienceResult["chemistry"] {
    const recommendations: string[] = [];

    // BUE risk at low speeds
    const bue_risk = params.cutting_speed_m_min < 30 && material.iso_group !== "N";

    if (bue_risk) {
      recommendations.push(
        "Built-up edge risk at low speed - increase speed or use coated insert"
      );
    }

    // Diffusion wear (titanium, nickel alloys at high temp)
    const diffusion_risk =
      (material.iso_group === "S" || material.iso_group === "M") &&
      thermal.tool_interface_temperature_C > 500;

    if (diffusion_risk) {
      recommendations.push(
        "Diffusion wear risk - use lower speed or PCD/ceramic tooling"
      );
    }

    // Coolant compatibility (simplified checks)
    let coolant_compatible = true;
    if (material.iso_group === "N" && params.coolant === "flood") {
      // Aluminum with chlorinated oil
      recommendations.push("Verify coolant compatibility with aluminum - avoid chlorinated oils");
      coolant_compatible = false;
    }

    // Oxidation layer
    const oxidation_expected =
      thermal.workpiece_surface_temperature_C > 250 && params.coolant === "none";

    // Chemical wear rate modifier
    let chem_wear_modifier = 1.0;
    if (diffusion_risk) chem_wear_modifier *= 1.5;
    if (bue_risk) chem_wear_modifier *= 1.2;

    return {
      bue_risk,
      diffusion_wear_risk: diffusion_risk,
      coolant_compatible,
      oxidation_layer_expected: oxidation_expected,
      chemical_wear_rate_modifier: chem_wear_modifier,
      recommendations,
      source: "Cutting tribology, Trent & Wright",
    };
  }

  /**
   * Chip mechanics analysis
   */
  private analyzeChipMechanics(
    material: MaterialProperties,
    params: CuttingParameters,
    thermal: UnifiedScienceResult["thermal"]
  ): UnifiedScienceResult["chip"] {
    const recommendations: string[] = [];
    const rake = params.rake_angle_deg || 6;

    // Shear angle (Merchant model simplified)
    const friction_angle = 35; // typical
    const shear_angle = 45 - friction_angle / 2 + rake / 2;

    // Chip thickness ratio
    const chip_ratio = Math.sin(shear_angle * Math.PI / 180) /
      Math.cos((shear_angle - rake) * Math.PI / 180);

    // Chip type
    let chip_type: "continuous" | "segmented" | "discontinuous" | "bue_affected" =
      "continuous";

    if (params.cutting_speed_m_min < 30) {
      chip_type = "bue_affected";
      recommendations.push("Increase speed to avoid BUE-affected chip");
    } else if (
      material.iso_group === "S" ||
      (material.iso_group === "K" && material.hardness_hrc && material.hardness_hrc > 40)
    ) {
      chip_type = "segmented";
    } else if (material.iso_group === "K" || material.iso_group === "H") {
      chip_type = "discontinuous";
    }

    // Chip curl radius (empirical)
    const curl_radius = 5 + params.feed_mm_rev * 50;

    // Chip breaking
    const chip_breaking =
      params.depth_of_cut_mm > 0.5 &&
      params.feed_mm_rev > 0.15 &&
      chip_type !== "continuous";

    if (!chip_breaking && chip_type === "continuous") {
      recommendations.push("Use chip breaker insert or increase feed for chip control");
    }

    return {
      chip_type,
      shear_angle_deg: shear_angle,
      chip_thickness_ratio: chip_ratio,
      chip_curl_radius_mm: curl_radius,
      chip_breaking_expected: chip_breaking,
      chip_control_recommendations: recommendations,
      source: "Merchant (1945), Shaw chip formation",
    };
  }

  /**
   * Deflection dynamics analysis
   */
  private analyzeDeflection(
    Fr: number,
    toolGeometry?: ToolGeometry,
    workpiece?: { diameter_mm: number; length_mm: number; wall_thickness_mm?: number }
  ): UnifiedScienceResult["deflection"] {
    const recommendations: string[] = [];

    // Tool deflection (cantilever beam)
    let tool_deflection = 0;
    if (toolGeometry) {
      const E = (toolGeometry.modulus_gpa || 200) * 1000; // MPa
      const L = toolGeometry.overhang_mm;
      const D = toolGeometry.shank_diameter_mm || toolGeometry.bar_diameter_mm || 20;
      const I = (Math.PI * Math.pow(D, 4)) / 64;

      tool_deflection = (Fr * Math.pow(L, 3)) / (3 * E * I);

      if (L / D > 4) {
        recommendations.push(`L/D ratio ${(L / D).toFixed(1)} > 4 - consider carbide bar or reduce overhang`);
      }
    }

    // Workpiece deflection
    let workpiece_deflection = 0;
    let dominant_mode: "tool" | "workpiece" | "combined" = "tool";

    if (workpiece) {
      const E = 200000; // MPa (steel)
      const L = workpiece.length_mm;
      const D = workpiece.diameter_mm;
      const I = (Math.PI * Math.pow(D, 4)) / 64;

      // Simply supported beam deflection
      workpiece_deflection = (Fr * Math.pow(L, 3)) / (48 * E * I);

      if (L / D > 5) {
        recommendations.push("Long slender part - use steady rest or tailstock support");
      }

      if (workpiece.wall_thickness_mm && workpiece.wall_thickness_mm < 3) {
        recommendations.push("Thin wall - reduce DOC and feed, cut in direction pushing into support");
        workpiece_deflection *= 2; // thin wall magnifier
      }
    }

    const total_deflection = tool_deflection + workpiece_deflection;

    if (workpiece_deflection > tool_deflection) {
      dominant_mode = "workpiece";
    } else if (Math.abs(tool_deflection - workpiece_deflection) < 0.01) {
      dominant_mode = "combined";
    }

    // Chatter risk assessment
    let chatter_risk: "low" | "medium" | "high" | "critical" = "low";
    if (total_deflection > 0.1) {
      chatter_risk = "critical";
      recommendations.push("High deflection - chatter likely, reduce parameters");
    } else if (total_deflection > 0.05) {
      chatter_risk = "high";
    } else if (total_deflection > 0.02) {
      chatter_risk = "medium";
    }

    return {
      tool_deflection_mm: tool_deflection,
      workpiece_deflection_mm: workpiece_deflection,
      total_deflection_mm: total_deflection,
      chatter_risk,
      dominant_mode,
      recommendations,
      source: "Structural mechanics, Tobias chatter theory",
    };
  }

  /**
   * Surface quality analysis
   */
  private analyzeSurface(
    params: CuttingParameters,
    deflection: UnifiedScienceResult["deflection"],
    chip: UnifiedScienceResult["chip"]
  ): UnifiedScienceResult["surface"] {
    const r = params.nose_radius_mm || 0.8;
    const f = params.feed_mm_rev;

    // Theoretical Ra (kinematic roughness)
    const Ra_theoretical = (f * f) / (32 * r) * 1000; // um

    // Adjustments for deflection and chip
    let Ra_predicted = Ra_theoretical;
    let limiting_factor = "kinematic";

    if (deflection.chatter_risk === "high" || deflection.chatter_risk === "critical") {
      Ra_predicted *= 2;
      limiting_factor = "vibration";
    }

    if (chip.chip_type === "bue_affected") {
      Ra_predicted *= 1.5;
      limiting_factor = "bue";
    }

    // Rz estimate
    const Rz = Ra_predicted * 4;

    // Surface integrity score
    let integrity_score = 1.0;
    if (Ra_predicted > 3.2) integrity_score -= 0.2;
    if (deflection.chatter_risk === "high") integrity_score -= 0.2;
    if (deflection.chatter_risk === "critical") integrity_score -= 0.4;
    if (chip.chip_type === "bue_affected") integrity_score -= 0.1;
    integrity_score = Math.max(0, integrity_score);

    return {
      theoretical_ra_um: Ra_theoretical,
      predicted_ra_um: Ra_predicted,
      rz_um: Rz,
      surface_integrity_score: integrity_score,
      limiting_factor,
      source: "Kinematic roughness model",
    };
  }

  /**
   * Compute overall assessment
   */
  private computeOverallAssessment(results: {
    forces: UnifiedScienceResult["forces"];
    toolLife: UnifiedScienceResult["tool_life"];
    thermal: UnifiedScienceResult["thermal"];
    metallurgy: UnifiedScienceResult["metallurgy"];
    chemistry: UnifiedScienceResult["chemistry"];
    chip: UnifiedScienceResult["chip"];
    deflection: UnifiedScienceResult["deflection"];
    surface: UnifiedScienceResult["surface"];
  }): UnifiedScienceResult["overall"] {
    const limiting_factors: string[] = [];
    const optimization_recommendations: string[] = [];
    const safety_warnings: string[] = [];

    // Tool life check
    if (results.toolLife.tool_life_min < 15) {
      limiting_factors.push("tool_life");
      optimization_recommendations.push(
        `Reduce speed to ${results.toolLife.optimal_speed_m_min.toFixed(0)} m/min for 30 min tool life`
      );
    }

    // Thermal check
    if (!results.thermal.coating_safe) {
      limiting_factors.push("thermal");
      safety_warnings.push("Coating temperature limit exceeded");
    }
    if (results.thermal.white_layer_risk) {
      safety_warnings.push("White layer formation risk on hardened surface");
    }

    // Deflection check
    if (results.deflection.chatter_risk === "critical") {
      limiting_factors.push("deflection");
      safety_warnings.push("Critical chatter risk - expect poor surface and potential tool damage");
    }

    // Chemistry check
    if (results.chemistry.diffusion_wear_risk) {
      limiting_factors.push("chemical_wear");
    }

    // Metallurgy check
    if (results.metallurgy.tempering_risk) {
      safety_warnings.push("Surface tempering may occur - verify hardness after machining");
    }

    // Surface check
    if (results.surface.surface_integrity_score < 0.7) {
      limiting_factors.push("surface_quality");
    }

    // Combine recommendations
    optimization_recommendations.push(...results.metallurgy.recommendations);
    optimization_recommendations.push(...results.chemistry.recommendations);
    optimization_recommendations.push(...results.chip.chip_control_recommendations);
    optimization_recommendations.push(...results.deflection.recommendations);

    // Compute overall score
    let score = 1.0;
    score *= results.toolLife.tool_life_min > 15 ? 1.0 : 0.7;
    score *= results.thermal.coating_safe ? 1.0 : 0.6;
    score *= results.surface.surface_integrity_score;
    score *= results.deflection.chatter_risk === "low" ? 1.0 :
             results.deflection.chatter_risk === "medium" ? 0.9 :
             results.deflection.chatter_risk === "high" ? 0.7 : 0.5;

    // Confidence (average of component confidences)
    const confidence =
      (results.toolLife.confidence + 0.85 + 0.80 + 0.85) / 4;

    return {
      process_score: score,
      limiting_factors,
      optimization_recommendations,
      safety_warnings,
      confidence,
    };
  }

  /**
   * Get recommended parameters for a target outcome
   */
  public recommendParameters(
    material: MaterialProperties,
    target: {
      tool_life_min?: number;
      max_ra_um?: number;
      max_deflection_mm?: number;
    }
  ): CuttingParameters {
    const taylor = CANONICAL_TAYLOR[material.iso_group];
    const target_life = target.tool_life_min || 30;

    // Calculate optimal speed for target tool life
    const Vc_opt = taylor.C / Math.pow(target_life, taylor.n);

    // Standard starting parameters
    let feed = 0.2;
    let doc = 2.0;

    // Adjust for surface finish
    if (target.max_ra_um && target.max_ra_um < 1.6) {
      feed = 0.08;
      doc = 0.5;
    }

    return {
      cutting_speed_m_min: Vc_opt,
      feed_mm_rev: feed,
      depth_of_cut_mm: doc,
      rake_angle_deg: 6,
      nose_radius_mm: 0.8,
      coolant: "flood",
    };
  }

  /**
   * Get version info
   */
  public getVersion(): string {
    return this.version;
  }
}

// Singleton export
export const latheUnifiedScienceEngine = new LatheUnifiedScienceEngine();

export default latheUnifiedScienceEngine;
