/**
 * MagnesiumMachiningEngine — Advanced Materials Machining
 *
 * Safety-critical magnesium alloy machining analysis:
 * - Chip ignition temperature model: T_chip = T_ambient + (Fc·Vc)/(ρ·Cp·Q)
 * - Fire risk classification with coolant interaction
 * - Safe practice recommendations per alloy and operation
 *
 * Actions: magnesium_fire_risk, magnesium_safe_practice
 */

// ============================================================================
// TYPES
// ============================================================================

export type MagnesiumAlloy = "AZ31" | "AZ61" | "AZ91" | "ZK60" | "WE43";
export type MgCoolantType = "dry" | "oil" | "emulsion" | "co2";

export interface MgFireRiskInput {
  alloy: MagnesiumAlloy;
  cutting_speed_mpm: number;
  feed_mm: number;
  depth_mm: number;
  coolant_type: MgCoolantType;
  chip_form?: "dust" | "fine" | "short" | "long";
  ambient_temp_C?: number;
}

export interface MgFireRiskResult {
  chip_temperature_C: number;
  ignition_temperature_C: number;
  fire_risk: "low" | "medium" | "high" | "critical";
  risk_score: number;
  required_precautions: string[];
  chip_form_risk: string;
  coolant_interaction: string;
  safe_speed_limit_mpm: number;
  warnings: string[];
}

export interface MgSafePracticeInput {
  alloy: MagnesiumAlloy;
  operation?: "milling" | "turning" | "drilling" | "grinding";
  chip_form?: "dust" | "fine" | "short" | "long";
}

export interface MgSafePracticeResult {
  approved_coolants: Array<{ type: string; notes: string; rating: "preferred" | "acceptable" | "avoid" }>;
  chip_handling_procedure: string[];
  extinguisher_type: string;
  ventilation_requirements: {
    type: string;
    min_air_changes_per_hour: number;
    leo_monitoring: boolean;
    notes: string;
  };
  tool_material_guidance: string[];
  storage_requirements: string[];
  ppe_requirements: string[];
  emergency_procedures: string[];
  warnings: string[];
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface MgAlloyProps {
  density_kg_m3: number;
  specific_heat_J_kgK: number;
  thermal_conductivity_W_mK: number;
  ignition_temp_C: number;
  melting_point_C: number;
  specific_cutting_force_N_mm2: number;
  /** Rare-earth content makes some alloys more fire-resistant */
  fire_resistance_factor: number;
  aluminum_pct: number;
}

const MG_ALLOY_PROPERTIES: Record<MagnesiumAlloy, MgAlloyProps> = {
  AZ31: {
    density_kg_m3: 1770, specific_heat_J_kgK: 1000,
    thermal_conductivity_W_mK: 96, ignition_temp_C: 430,
    melting_point_C: 630, specific_cutting_force_N_mm2: 350,
    fire_resistance_factor: 1.0, aluminum_pct: 3,
  },
  AZ61: {
    density_kg_m3: 1800, specific_heat_J_kgK: 1000,
    thermal_conductivity_W_mK: 61, ignition_temp_C: 455,
    melting_point_C: 620, specific_cutting_force_N_mm2: 380,
    fire_resistance_factor: 1.05, aluminum_pct: 6,
  },
  AZ91: {
    density_kg_m3: 1810, specific_heat_J_kgK: 1000,
    thermal_conductivity_W_mK: 72, ignition_temp_C: 475,
    melting_point_C: 598, specific_cutting_force_N_mm2: 400,
    fire_resistance_factor: 1.1, aluminum_pct: 9,
  },
  ZK60: {
    density_kg_m3: 1830, specific_heat_J_kgK: 960,
    thermal_conductivity_W_mK: 115, ignition_temp_C: 440,
    melting_point_C: 635, specific_cutting_force_N_mm2: 420,
    fire_resistance_factor: 1.0, aluminum_pct: 0,
  },
  WE43: {
    density_kg_m3: 1840, specific_heat_J_kgK: 970,
    thermal_conductivity_W_mK: 51, ignition_temp_C: 550,
    melting_point_C: 640, specific_cutting_force_N_mm2: 450,
    fire_resistance_factor: 1.4, // rare-earth content improves ignition resistance
    aluminum_pct: 0,
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class MagnesiumMachiningEngine {
  /**
   * Assess fire risk during magnesium machining.
   * T_chip = T_ambient + (Fc · Vc) / (ρ · Cp · Q)
   */
  assessFireRisk(input: MgFireRiskInput): MgFireRiskResult {
    const alloy = MG_ALLOY_PROPERTIES[input.alloy];
    const warnings: string[] = [];
    const precautions: string[] = [];
    const T_ambient = input.ambient_temp_C ?? 25;
    const chip_form = input.chip_form ?? "short";

    // Cutting force: Fc = kc · ap · f
    const Fc = alloy.specific_cutting_force_N_mm2 * input.depth_mm * input.feed_mm;

    // Cutting speed in m/s
    const Vc_ms = input.cutting_speed_mpm / 60;

    // Volumetric chip removal rate (m³/s)
    // Q = ap · f · Vc (simplified, assuming ae = f for turning-like)
    const Q_m3s = input.depth_mm * 1e-3 * input.feed_mm * 1e-3 * Vc_ms;

    // Chip temperature: T_chip = T_ambient + η · (Fc · Vc) / (ρ · Cp · Q)
    // η = fraction of heat going to chip (≈0.7 for Mg due to high conductivity)
    const eta = 0.7;
    const T_chip_rise = Q_m3s > 1e-15
      ? (eta * Fc * Vc_ms) / (alloy.density_kg_m3 * alloy.specific_heat_J_kgK * Q_m3s)
      : 500; // fallback for very small cuts
    const T_chip = T_ambient + Math.min(T_chip_rise, alloy.melting_point_C - T_ambient);

    // Ignition temperature adjusted for fire resistance
    const T_ignition = alloy.ignition_temp_C * alloy.fire_resistance_factor;

    // Coolant interaction effects
    let coolant_temp_modifier = 1.0;
    let coolant_interaction = "";
    switch (input.coolant_type) {
      case "dry":
        coolant_temp_modifier = 1.0;
        coolant_interaction = "No coolant — chip temperature at maximum. Acceptable if chips are properly managed.";
        break;
      case "oil":
        coolant_temp_modifier = 0.75;
        coolant_interaction = "Mineral oil — good cooling, low water content. Preferred for Mg if oil mist is managed.";
        break;
      case "emulsion":
        coolant_temp_modifier = 0.6;
        coolant_interaction = "WARNING: Water-based emulsion reacts with hot Mg chips producing hydrogen gas. Use only with proper ventilation and >8% concentration.";
        warnings.push("Water-based coolant + hot Mg chips can produce explosive hydrogen gas");
        break;
      case "co2":
        coolant_temp_modifier = 0.5;
        coolant_interaction = "CO2 cryogenic — excellent cooling and inert atmosphere. Safest option for Mg machining.";
        break;
    }

    const effective_chip_temp = T_ambient + (T_chip - T_ambient) * coolant_temp_modifier;

    // Chip form risk multiplier
    let chip_form_risk_mult = 1.0;
    let chip_form_risk = "";
    switch (chip_form) {
      case "dust":
        chip_form_risk_mult = 3.0;
        chip_form_risk = "EXTREME — Mg dust is explosive. Minimum ignition energy ~20 mJ. Requires wet collection or inert atmosphere.";
        break;
      case "fine":
        chip_form_risk_mult = 2.0;
        chip_form_risk = "HIGH — Fine chips ignite easily from sparks. Avoid accumulation. Vacuum frequently.";
        break;
      case "short":
        chip_form_risk_mult = 1.0;
        chip_form_risk = "MODERATE — Short chips are manageable. Keep area clean, avoid piles.";
        break;
      case "long":
        chip_form_risk_mult = 0.8;
        chip_form_risk = "LOWER — Long continuous chips have less surface area, lower ignition risk.";
        break;
    }

    // Risk score: 0-1 based on temperature margin and chip form
    const temp_ratio = effective_chip_temp / T_ignition;
    const risk_score = Math.min(1, Math.max(0, temp_ratio * chip_form_risk_mult));

    // Risk classification
    let fire_risk: MgFireRiskResult["fire_risk"];
    if (risk_score < 0.4) fire_risk = "low";
    else if (risk_score < 0.65) fire_risk = "medium";
    else if (risk_score < 0.85) fire_risk = "high";
    else fire_risk = "critical";

    // Calculate safe speed limit (where risk < 0.5 with current chip form)
    const target_risk = 0.5;
    const target_temp = T_ignition * target_risk / chip_form_risk_mult;
    const target_temp_rise = (target_temp - T_ambient) / coolant_temp_modifier;
    // Solve for Vc: T_rise ∝ Vc (approximately, since Q also scales with Vc but Fc·Vc/Q ∝ kc)
    const safe_speed = input.cutting_speed_mpm * (target_temp_rise / Math.max(T_chip - T_ambient, 1));

    // Build precautions list
    precautions.push("Keep Class D fire extinguisher within arm's reach of machine");
    precautions.push("Never use water on Mg fire — violent exothermic reaction");
    if (fire_risk === "high" || fire_risk === "critical") {
      precautions.push("STOP: Reduce cutting speed or switch to CO2 coolant immediately");
      precautions.push("Ensure non-sparking tooling and fixturing");
    }
    if (chip_form === "dust" || chip_form === "fine") {
      precautions.push("Use wet-type dust collector — dry vacuum can cause explosion");
      precautions.push("Ground all equipment to prevent static discharge ignition");
      precautions.push("Maximum chip accumulation: 0.5 kg before cleanup");
    }
    if (input.coolant_type === "emulsion") {
      precautions.push("Monitor for hydrogen gas buildup — install H2 sensor");
      precautions.push("Maintain coolant concentration >8% to minimize reaction");
    }
    precautions.push("Store Mg chips in covered steel containers away from moisture");
    precautions.push("Post 'MAGNESIUM — NO WATER' signage on machine");

    if (fire_risk === "critical") {
      warnings.push("CRITICAL FIRE RISK — chip temperature approaching ignition point");
    }
    if (effective_chip_temp > alloy.melting_point_C * 0.9) {
      warnings.push("Near melting point — chips may be molten, extreme fire hazard");
    }

    return {
      chip_temperature_C: Math.round(effective_chip_temp),
      ignition_temperature_C: Math.round(T_ignition),
      fire_risk,
      risk_score: Math.round(risk_score * 1000) / 1000,
      required_precautions: precautions,
      chip_form_risk,
      coolant_interaction,
      safe_speed_limit_mpm: Math.round(Math.max(safe_speed, 10) * 10) / 10,
      warnings,
    };
  }

  /**
   * Recommend safe machining practices for magnesium alloys.
   */
  recommendSafePractice(input: MgSafePracticeInput): MgSafePracticeResult {
    const alloy = MG_ALLOY_PROPERTIES[input.alloy];
    const operation = input.operation ?? "milling";
    const chip_form = input.chip_form ?? "short";
    const warnings: string[] = [];

    // Approved coolants
    const coolants: MgSafePracticeResult["approved_coolants"] = [
      {
        type: "Mineral oil (non-water-soluble)",
        notes: "Preferred for Mg. High flash-point mineral oil >150°C. No water content.",
        rating: "preferred",
      },
      {
        type: "CO2 cryogenic",
        notes: "Safest option. Inert atmosphere suppresses ignition. Excellent for finishing.",
        rating: "preferred",
      },
      {
        type: "Dry machining with air blast",
        notes: "Acceptable for low-speed operations. Compressed air clears chips. No fire interaction risk.",
        rating: "acceptable",
      },
    ];

    if (alloy.fire_resistance_factor >= 1.3) {
      // WE43 rare-earth alloy is more tolerant
      coolants.push({
        type: "Water-miscible coolant (>8% concentration)",
        notes: `${input.alloy} has improved ignition resistance from rare-earth content. Water-based acceptable with precautions.`,
        rating: "acceptable",
      });
    } else {
      coolants.push({
        type: "Water-based emulsion",
        notes: "AVOID — hot Mg + water → MgO + H2 (explosive). Only use if concentration >8% AND H2 monitoring installed.",
        rating: "avoid",
      });
    }

    // Chip handling
    const chip_handling: string[] = [
      "Collect chips frequently — maximum accumulation 0.5 kg",
      "Store in covered, labeled steel containers ('MAGNESIUM CHIPS — NO WATER')",
      "Keep containers away from moisture, oil, and heat sources",
      "Dispose through licensed hazardous waste handler",
      "Never compress or bale Mg chips — friction can cause ignition",
    ];
    if (chip_form === "dust" || chip_form === "fine") {
      chip_handling.unshift("Use WET-TYPE dust collection — dry vacuum is an explosion risk");
      chip_handling.push("Clean up dust with non-sparking brass/copper tools");
      chip_handling.push("Ground all collection equipment to prevent static discharge");
    }
    if (operation === "grinding") {
      chip_handling.unshift("Grinding produces fine particles — HIGHEST fire risk operation for Mg");
      chip_handling.push("Use dedicated Mg grinding equipment with spark-resistant guards");
      chip_handling.push("Wet grinding recommended — use oil-based grinding fluid only");
      warnings.push("Grinding magnesium is inherently dangerous — consider alternative finishing processes");
    }

    // Ventilation
    const ventilation = {
      type: operation === "grinding" || chip_form === "dust"
        ? "Dedicated LEV (local exhaust ventilation) with wet filtration"
        : "General ventilation with local extraction",
      min_air_changes_per_hour: operation === "grinding" ? 20 : 12,
      leo_monitoring: chip_form === "dust" || chip_form === "fine",
      notes: alloy.aluminum_pct > 5
        ? `${input.alloy} contains ${alloy.aluminum_pct}% Al — dust is both combustible and explosive. LEL monitoring required.`
        : "Standard Mg machining ventilation. Monitor for H2 if using water-based coolant.",
    };

    // Tool material guidance
    const tool_guidance: string[] = [
      "Use sharp, polished PCD or uncoated carbide tools",
      "Large positive rake angle (10-15°) to reduce cutting forces and heat",
      "Large clearance angle (10-12°) to prevent rubbing",
      "High helix angle (45°+) for efficient chip evacuation",
      "Avoid dull tools — increased friction generates dangerous heat",
    ];
    if (operation === "drilling") {
      tool_guidance.push("Use through-coolant drills with oil for deep holes");
      tool_guidance.push("Frequent peck cycles to prevent chip packing and heat buildup");
      tool_guidance.push("Point angle 118° with split point for clean entry");
    }
    if (operation === "turning") {
      tool_guidance.push("Use chip breaker geometry — long continuous chips are harder to manage");
      tool_guidance.push("Nose radius 0.4-0.8 mm for good finish without excessive heat");
    }

    // Storage
    const storage = [
      "Store raw material in dry location, away from water and chemicals",
      "Keep Mg chips in approved, labeled steel containers with lids",
      "Separate from other metal chips — especially iron/steel (thermite risk)",
      "Maximum 30-day chip storage before disposal",
      `${input.alloy} ignition temperature: ${alloy.ignition_temp_C}°C — keep ambient well below this`,
    ];

    // PPE
    const ppe = [
      "Safety glasses with side shields (minimum)",
      "Face shield when grinding or risk of chip ignition",
      "Leather or flame-resistant gloves (NOT synthetic — they melt)",
      "Flame-resistant clothing or leather apron",
      "Safety shoes with non-sparking soles",
    ];

    // Emergency procedures
    const emergency = [
      "FIRE: Use Class D extinguisher (sodium chloride or copper powder)",
      "NEVER use water, CO2 fire extinguisher, foam, or halon on Mg fire",
      "Cover small fires with dry sand or cast iron chips to smother",
      "Evacuate area if fire cannot be immediately controlled",
      "Call fire department — inform them it is a MAGNESIUM fire",
      "After fire: do not disturb until fully cooled (2+ hours)",
      "Skin burns from molten Mg: cool with dry dressing only, NO water",
    ];

    return {
      approved_coolants: coolants,
      chip_handling_procedure: chip_handling,
      extinguisher_type: "Class D (sodium chloride, copper powder, or graphite-based)",
      ventilation_requirements: ventilation,
      tool_material_guidance: tool_guidance,
      storage_requirements: storage,
      ppe_requirements: ppe,
      emergency_procedures: emergency,
      warnings,
    };
  }
  /**
   * Fire risk assessment with Bayesian temperature uncertainty quantification.
   *
   * The base assessFireRisk() returns a point estimate of chip temperature.
   * In safety-critical Mg machining, KNOWING the uncertainty matters: a mean
   * temperature of 400°C with σ=50°C means ~16% chance of exceeding 480°C.
   *
   * When IR temperature observations are available from previous cuts, this
   * method uses BayesianWearModel to compute a posterior temperature
   * distribution and confidence-weighted fire risk.
   *
   * SAFETY: Water-based coolant + hot Mg = explosive H₂ gas (MIE ~20 mJ).
   * Class D extinguisher ONLY. Never water, CO₂ fire extinguisher, or foam.
   *
   * Lazy-requires BayesianWearModel; falls back to assessFireRisk() if unavailable.
   *
   * Reference: Mg machining fire incidents (ASM Handbook Vol 16);
   *            Playbook: Class D extinguisher, H₂ monitoring
   */
  assessFireRiskWithUncertainty(input: MgFireRiskInput & {
    observed_temperatures?: number[];
  }): MgFireRiskResult & {
    bayesian_model_used: boolean;
    temperature_posterior_mean: number | null;
    temperature_posterior_std: number | null;
    temperature_credible_95: [number, number] | null;
    probability_exceeds_ignition: number | null;
    confidence_in_risk: number;
  } {
    const baseResult = this.assessFireRisk(input);
    const alloy = MG_ALLOY_PROPERTIES[input.alloy];
    const observed = input.observed_temperatures;
    const T_ignition = alloy.ignition_temp_C * alloy.fire_resistance_factor;

    if (!observed || observed.length === 0) {
      return {
        ...baseResult,
        bayesian_model_used: false,
        temperature_posterior_mean: null,
        temperature_posterior_std: null,
        temperature_credible_95: null,
        probability_exceeds_ignition: null,
        confidence_in_risk: 0.6, // low confidence without observations
      };
    }

    let bayesianUsed = false;
    let postMean: number | null = null;
    let postStd: number | null = null;
    let ci95: [number, number] | null = null;
    let pExceed: number | null = null;
    let confidence = 0.6;

    try {
      const { BayesianWearModel } = require("../algorithms/BayesianWearModel.js");
      const bwm = new BayesianWearModel();

      // Prior: model-predicted chip temperature ± 15% (thermal model uncertainty)
      const priorMean = baseResult.chip_temperature_C;
      const priorStd = priorMean * 0.15;

      const bmResult = bwm.calculate({
        prior_mean: priorMean,
        prior_std: priorStd,
        observations: observed,
        likelihood_std: priorStd * 0.8, // IR sensors slightly more precise than model
        vb_threshold: T_ignition, // threshold = ignition temperature
      });

      bayesianUsed = true;
      postMean = bmResult.posterior_mean;
      postStd = bmResult.posterior_std;
      ci95 = bmResult.credible_interval_95;
      pExceed = bmResult.probability_exceed_threshold;
      confidence = observed.length >= 5 ? 0.92
        : observed.length >= 3 ? 0.85 : 0.75;

      // Escalate fire risk if posterior shows significant ignition probability
      if (pExceed !== null && pExceed > 0.1) {
        const existingWarnings = baseResult.warnings;
        existingWarnings.push(
          `Bayesian analysis: ${(pExceed * 100).toFixed(1)}% probability of ` +
          `exceeding ignition temperature ${Math.round(T_ignition)}°C — ` +
          "REDUCE speed or switch to CO₂ coolant"
        );
      }
    } catch {
      // Fallback: simple statistics on observations
      const obsMean = observed.reduce((s, v) => s + v, 0) / observed.length;
      const obsVar = observed.reduce((s, v) => s + (v - obsMean) ** 2, 0) / Math.max(observed.length - 1, 1);
      postMean = obsMean;
      postStd = Math.sqrt(obsVar);
      ci95 = [obsMean - 1.96 * Math.sqrt(obsVar), obsMean + 1.96 * Math.sqrt(obsVar)];
      confidence = 0.7;
    }

    return {
      ...baseResult,
      bayesian_model_used: bayesianUsed,
      temperature_posterior_mean: postMean !== null
        ? Math.round(postMean * 10) / 10 : null,
      temperature_posterior_std: postStd !== null
        ? Math.round(postStd * 10) / 10 : null,
      temperature_credible_95: ci95 !== null ? [
        Math.round(ci95[0] * 10) / 10,
        Math.round(ci95[1] * 10) / 10,
      ] : null,
      probability_exceeds_ignition: pExceed !== null
        ? Math.round(pExceed * 10000) / 10000 : null,
      confidence_in_risk: confidence,
    };
  }
}

/** Singleton instance */
export const magnesiumMachiningEngine = new MagnesiumMachiningEngine();
