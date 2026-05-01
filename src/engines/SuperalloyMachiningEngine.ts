/**
 * SuperalloyMachiningEngine — Advanced Materials Machining
 *
 * Physics-based superalloy/nickel-alloy machining analysis:
 * - Johnson-Cook constitutive model at elevated temperatures
 * - Usui crater wear model: dW/dt = A·σn·Vs·exp(-B/T)
 * - Safe process window determination
 *
 * Actions: superalloy_analyze, superalloy_crater_wear, superalloy_process_window
 */

// ============================================================================
// TYPES
// ============================================================================

export type SuperalloyType = "inconel_718" | "inconel_625" | "waspaloy" | "rene_41" | "hastelloy_x" | "mar_m247";

export interface SuperalloyAnalyzeInput {
  alloy: SuperalloyType;
  cutting_speed_mpm: number;
  feed_mm: number;
  depth_mm: number;
  tool_material?: "carbide" | "ceramic" | "cbn" | "pcbn";
  coolant?: "flood" | "hpc" | "mql" | "dry";
}

export interface SuperalloyAnalyzeResult {
  cutting_force_N: number;
  temperature_C: number;
  tool_life_min: number;
  recommended_coating: string;
  jc_flow_stress_MPa: number;
  strain: number;
  strain_rate: number;
  thermal_softening_factor: number;
  power_kW: number;
  specific_cutting_energy_J_mm3: number;
  warnings: string[];
}

export interface CraterWearInput {
  alloy: SuperalloyType;
  cutting_speed_mpm: number;
  feed_mm: number;
  depth_mm: number;
  tool_material?: "carbide" | "ceramic" | "cbn" | "pcbn";
  current_wear_mm?: number;
}

export interface CraterWearResult {
  crater_depth_mm_per_min: number;
  expected_tool_life_min: number;
  replacement_interval_min: number;
  usui_parameters: { A: number; B: number };
  contact_temperature_C: number;
  normal_stress_MPa: number;
  sliding_velocity_mpm: number;
  wear_progression: Array<{ time_min: number; crater_depth_mm: number }>;
  warnings: string[];
}

export interface ProcessWindowInput {
  alloy: SuperalloyType;
  tool_material?: "carbide" | "ceramic" | "cbn" | "pcbn";
  operation?: "roughing" | "finishing" | "semi_finishing";
  min_tool_life_min?: number;
}

export interface ProcessWindowResult {
  speed_range: { min_mpm: number; max_mpm: number; optimal_mpm: number };
  feed_range: { min_mm: number; max_mm: number; optimal_mm: number };
  depth_range: { min_mm: number; max_mm: number; optimal_mm: number };
  coolant_requirements: {
    type: string;
    pressure_bar: number;
    flow_rate_lpm: number;
  };
  tool_material_requirements: string[];
  max_temperature_C: number;
  expected_tool_life_min: number;
  warnings: string[];
}

// ============================================================================
// MATERIAL DATABASE — Johnson-Cook parameters & alloy properties
// ============================================================================

interface JCParams {
  A: number;  // Yield stress (MPa)
  B: number;  // Hardening modulus (MPa)
  n: number;  // Hardening exponent
  C: number;  // Strain rate sensitivity
  m: number;  // Thermal softening exponent
  T_melt: number;  // Melting temperature (°C)
  T_ref: number;   // Reference temperature (°C)
  density_kg_m3: number;
  specific_heat_J_kgK: number;
  thermal_conductivity_W_mK: number;
  hardness_HRC: number;
}

const ALLOY_PROPERTIES: Record<SuperalloyType, JCParams> = {
  inconel_718: {
    A: 1241, B: 622, n: 0.6522, C: 0.0134, m: 1.3,
    T_melt: 1336, T_ref: 25, density_kg_m3: 8190,
    specific_heat_J_kgK: 435, thermal_conductivity_W_mK: 11.4, hardness_HRC: 44,
  },
  inconel_625: {
    A: 856, B: 1060, n: 0.72, C: 0.0122, m: 1.25,
    T_melt: 1350, T_ref: 25, density_kg_m3: 8440,
    specific_heat_J_kgK: 410, thermal_conductivity_W_mK: 9.8, hardness_HRC: 38,
  },
  waspaloy: {
    A: 960, B: 794, n: 0.64, C: 0.014, m: 1.15,
    T_melt: 1330, T_ref: 25, density_kg_m3: 8190,
    specific_heat_J_kgK: 460, thermal_conductivity_W_mK: 10.7, hardness_HRC: 42,
  },
  rene_41: {
    A: 1100, B: 750, n: 0.58, C: 0.015, m: 1.2,
    T_melt: 1315, T_ref: 25, density_kg_m3: 8250,
    specific_heat_J_kgK: 420, thermal_conductivity_W_mK: 10.0, hardness_HRC: 40,
  },
  hastelloy_x: {
    A: 580, B: 1060, n: 0.71, C: 0.012, m: 1.1,
    T_melt: 1355, T_ref: 25, density_kg_m3: 8220,
    specific_heat_J_kgK: 473, thermal_conductivity_W_mK: 9.1, hardness_HRC: 35,
  },
  mar_m247: {
    A: 1200, B: 680, n: 0.55, C: 0.016, m: 1.35,
    T_melt: 1315, T_ref: 25, density_kg_m3: 8540,
    specific_heat_J_kgK: 400, thermal_conductivity_W_mK: 8.5, hardness_HRC: 48,
  },
};

// Usui crater wear parameters by tool material
interface UsuiParams { A: number; B: number; max_crater_mm: number }
const USUI_PARAMS: Record<string, UsuiParams> = {
  carbide:  { A: 1e-5,  B: 2500, max_crater_mm: 0.25 },
  ceramic:  { A: 3e-6,  B: 3500, max_crater_mm: 0.20 },
  cbn:      { A: 1e-6,  B: 4500, max_crater_mm: 0.15 },
  pcbn:     { A: 8e-7,  B: 5000, max_crater_mm: 0.12 },
};

// ============================================================================
// ENGINE
// ============================================================================

export class SuperalloyMachiningEngine {
  /**
   * Analyze nickel alloy cutting with Johnson-Cook constitutive model.
   * σ = (A + B·ε^n)(1 + C·ln(ε̇/ε̇0))(1 - T*^m)
   */
  analyzeNickelAlloy(input: SuperalloyAnalyzeInput): SuperalloyAnalyzeResult {
    const alloy = ALLOY_PROPERTIES[input.alloy];
    const tool = input.tool_material ?? "carbide";
    const coolant = input.coolant ?? "flood";
    const warnings: string[] = [];

    // Strain estimation: ε ≈ cos(γ) / (cos(φ-γ)·sin(φ))
    // Simplified using typical shear angle φ ≈ 25° and rake γ ≈ 5°
    const phi = 25 * Math.PI / 180;
    const gamma = 5 * Math.PI / 180;
    const strain = Math.cos(gamma) / (Math.cos(phi - gamma) * Math.sin(phi));

    // Strain rate: ε̇ ≈ Vc / (√3 · primary shear zone thickness)
    const Vc_ms = input.cutting_speed_mpm / 60; // m/s
    const shear_zone_thickness = input.feed_mm * 0.1; // mm, typical
    const strain_rate = Vc_ms * 1000 / (Math.sqrt(3) * Math.max(shear_zone_thickness, 0.01));
    const strain_rate_ref = 1.0; // reference strain rate 1/s

    // Cutting temperature estimation: T ≈ T_ref + η·(Fc·Vc)/(ρ·Cp·Q)
    // Boothroyd-Knight model simplified
    const chip_area_mm2 = input.feed_mm * input.depth_mm;
    const Q_flow = chip_area_mm2 * Vc_ms * 1000; // mm³/s → material removal rate
    const coolant_factor = coolant === "dry" ? 1.0 : coolant === "mql" ? 0.85 : coolant === "hpc" ? 0.6 : 0.7;
    const eta_heat = 0.85; // fraction of cutting energy becoming heat
    const chip_heat_fraction = 0.75; // fraction going to chip

    // Initial force estimate for temperature (iterate once)
    const kc_approx = alloy.A + alloy.B * Math.pow(strain, alloy.n); // without thermal
    const Fc_init = kc_approx * chip_area_mm2;
    const T_rise = (eta_heat * chip_heat_fraction * coolant_factor * Fc_init * Vc_ms) /
      (alloy.density_kg_m3 * alloy.specific_heat_J_kgK * Math.max(Q_flow * 1e-9, 1e-12));
    const T_cutting = alloy.T_ref + Math.min(T_rise, alloy.T_melt - 50);

    // Johnson-Cook flow stress
    const T_star = Math.max(0, Math.min(1, (T_cutting - alloy.T_ref) / (alloy.T_melt - alloy.T_ref)));
    const strain_hardening = alloy.A + alloy.B * Math.pow(strain, alloy.n);
    const strain_rate_factor = 1 + alloy.C * Math.log(Math.max(1, strain_rate / strain_rate_ref));
    const thermal_softening = 1 - Math.pow(T_star, alloy.m);
    const jc_stress = strain_hardening * strain_rate_factor * thermal_softening;

    // Cutting force: Fc = σ · Ac / sin(φ) · factor
    const Fc = jc_stress * chip_area_mm2 / Math.sin(phi);

    // Power
    const power_kW = (Fc * Vc_ms) / 1000;

    // Specific cutting energy
    const sce = Fc / Math.max(chip_area_mm2, 0.001);

    // Tool life — simplified Usui-based with Taylor correction
    const usui = USUI_PARAMS[tool];
    const T_contact = T_cutting * 1.1; // contact temp slightly higher
    const wear_rate = usui.A * jc_stress * (Vc_ms * 60) * Math.exp(-usui.B / (T_contact + 273));
    const tool_life = wear_rate > 1e-10 ? usui.max_crater_mm / wear_rate : 999;

    // Coating recommendation
    const coating = this._recommendCoating(tool, T_cutting, input.alloy);

    if (T_cutting > 800) warnings.push(`Cutting temperature ${Math.round(T_cutting)}°C is very high — consider HPC coolant`);
    if (tool_life < 5) warnings.push(`Tool life ${tool_life.toFixed(1)} min is critically short — reduce speed`);
    if (tool === "carbide" && input.cutting_speed_mpm > 60) {
      warnings.push("Carbide tools have limited life above 60 m/min on nickel alloys — consider ceramic");
    }
    if (power_kW > 15) warnings.push(`Power requirement ${power_kW.toFixed(1)} kW is high — verify spindle capacity`);

    return {
      cutting_force_N: Math.round(Fc * 10) / 10,
      temperature_C: Math.round(T_cutting),
      tool_life_min: Math.round(tool_life * 10) / 10,
      recommended_coating: coating,
      jc_flow_stress_MPa: Math.round(jc_stress),
      strain: Math.round(strain * 1000) / 1000,
      strain_rate: Math.round(strain_rate),
      thermal_softening_factor: Math.round(thermal_softening * 1000) / 1000,
      power_kW: Math.round(power_kW * 100) / 100,
      specific_cutting_energy_J_mm3: Math.round(sce * 100) / 100,
      warnings,
    };
  }

  /**
   * Predict crater wear using Usui model.
   * dW/dt = A · σn · Vs · exp(-B/T)
   */
  predictCraterWear(input: CraterWearInput): CraterWearResult {
    const alloy = ALLOY_PROPERTIES[input.alloy];
    const tool = input.tool_material ?? "carbide";
    const usui = USUI_PARAMS[tool];
    const warnings: string[] = [];

    // Calculate contact conditions
    const Vc_ms = input.cutting_speed_mpm / 60;
    const chip_area = input.feed_mm * input.depth_mm;
    const kc = alloy.A + alloy.B * 0.5; // approximate mid-strain stress
    const normal_stress = kc * 0.6; // contact stress ≈ 60% of flow stress
    const sliding_velocity = Vc_ms * 60 * 0.8; // chip slides ~80% of cutting speed

    // Contact temperature (Loewen-Shaw simplified)
    const coolant_eff = 0.7;
    const T_contact = alloy.T_ref + coolant_eff * (0.4 * kc * chip_area * Vc_ms) /
      (alloy.thermal_conductivity_W_mK * Math.sqrt(Math.max(chip_area, 0.01)));
    const T_contact_K = T_contact + 273;

    // Usui wear rate: dW/dt = A · σn · Vs · exp(-B/T)
    const crater_rate = usui.A * normal_stress * sliding_velocity * Math.exp(-usui.B / T_contact_K);

    // Tool life to max crater depth
    const current_wear = input.current_wear_mm ?? 0;
    const remaining_depth = usui.max_crater_mm - current_wear;
    const tool_life = crater_rate > 1e-12 ? remaining_depth / crater_rate : 9999;

    // Replacement interval: 80% of tool life for safety
    const replacement_interval = tool_life * 0.8;

    // Wear progression curve (10 points)
    const progression: CraterWearResult["wear_progression"] = [];
    const dt = tool_life / 10;
    for (let i = 0; i <= 10; i++) {
      const t = dt * i;
      // Accelerating wear: slightly nonlinear
      const depth = current_wear + crater_rate * t * (1 + 0.1 * t / Math.max(tool_life, 1));
      progression.push({
        time_min: Math.round(t * 10) / 10,
        crater_depth_mm: Math.round(Math.min(depth, usui.max_crater_mm) * 10000) / 10000,
      });
    }

    if (tool_life < 10) warnings.push("Very short tool life — reduce cutting speed or use more wear-resistant tool");
    if (T_contact > 1000) warnings.push(`Contact temperature ${Math.round(T_contact)}°C exceeds safe limit for ${tool}`);
    if (current_wear > usui.max_crater_mm * 0.7) warnings.push("Current wear is above 70% of max — tool change imminent");

    return {
      crater_depth_mm_per_min: crater_rate,
      expected_tool_life_min: Math.round(tool_life * 10) / 10,
      replacement_interval_min: Math.round(replacement_interval * 10) / 10,
      usui_parameters: { A: usui.A, B: usui.B },
      contact_temperature_C: Math.round(T_contact),
      normal_stress_MPa: Math.round(normal_stress),
      sliding_velocity_mpm: Math.round(sliding_velocity * 10) / 10,
      wear_progression: progression,
      warnings,
    };
  }

  /**
   * Determine safe process window for a superalloy + tool combination.
   */
  getProcessWindow(input: ProcessWindowInput): ProcessWindowResult {
    const alloy = ALLOY_PROPERTIES[input.alloy];
    const tool = input.tool_material ?? "carbide";
    const op = input.operation ?? "roughing";
    const min_life = input.min_tool_life_min ?? 15;
    const warnings: string[] = [];

    // Base speed ranges by tool material (m/min)
    const speed_base: Record<string, { min: number; max: number }> = {
      carbide: { min: 15, max: 60 },
      ceramic: { min: 150, max: 600 },
      cbn:     { min: 100, max: 300 },
      pcbn:    { min: 120, max: 350 },
    };

    // Adjust for alloy hardness (harder = slower)
    const hardness_factor = 44 / alloy.hardness_HRC; // normalized to IN718
    const base = speed_base[tool];
    let speed_min = base.min * hardness_factor;
    let speed_max = base.max * hardness_factor;

    // Feed ranges by operation
    const feed_ranges: Record<string, { min: number; max: number }> = {
      roughing:       { min: 0.15, max: 0.35 },
      semi_finishing: { min: 0.08, max: 0.20 },
      finishing:      { min: 0.03, max: 0.12 },
    };
    const feed_base = feed_ranges[op];

    // Depth ranges by operation
    const depth_ranges: Record<string, { min: number; max: number }> = {
      roughing:       { min: 1.0, max: 4.0 },
      semi_finishing: { min: 0.3, max: 1.5 },
      finishing:      { min: 0.1, max: 0.5 },
    };
    const depth_base = depth_ranges[op];

    // Constrain speed for tool life requirement
    // Higher speed = shorter life; binary search for max speed giving min_life
    let speed_for_life = speed_max;
    for (let s = speed_max; s >= speed_min; s -= 2) {
      const wear_result = this.predictCraterWear({
        alloy: input.alloy,
        cutting_speed_mpm: s,
        feed_mm: (feed_base.min + feed_base.max) / 2,
        depth_mm: (depth_base.min + depth_base.max) / 2,
        tool_material: tool as any,
      });
      if (wear_result.expected_tool_life_min >= min_life) {
        speed_for_life = s;
        break;
      }
    }
    speed_max = Math.min(speed_max, speed_for_life);

    // Optimal = geometric mean
    const optimal_speed = Math.sqrt(speed_min * speed_max);
    const optimal_feed = Math.sqrt(feed_base.min * feed_base.max);
    const optimal_depth = Math.sqrt(depth_base.min * depth_base.max);

    // Temperature at optimal conditions
    const analysis = this.analyzeNickelAlloy({
      alloy: input.alloy,
      cutting_speed_mpm: optimal_speed,
      feed_mm: optimal_feed,
      depth_mm: optimal_depth,
      tool_material: tool as any,
    });

    // Coolant requirements
    const coolant_pressure = tool === "ceramic" ? 0 : alloy.hardness_HRC > 40 ? 70 : 40; // bar
    const coolant_flow = coolant_pressure > 0 ? 15 + coolant_pressure * 0.1 : 0; // L/min
    const coolant_type = tool === "ceramic" ? "dry (ceramic requires dry cutting)"
      : coolant_pressure > 50 ? "HPC (high-pressure coolant)"
      : "flood coolant";

    // Tool material recommendations
    const tool_reqs: string[] = [];
    if (tool === "carbide") {
      tool_reqs.push("Submicron grain carbide (K10-K20)");
      tool_reqs.push("AlTiN or TiAlN PVD coating essential");
      tool_reqs.push("Positive rake geometry with chip breaker");
    } else if (tool === "ceramic") {
      tool_reqs.push("SiAlON or whisker-reinforced Al2O3 ceramic");
      tool_reqs.push("Round inserts preferred for strength");
      tool_reqs.push("Must run DRY — thermal shock risk with coolant");
    } else {
      tool_reqs.push(`${tool.toUpperCase()} with chamfered edge preparation`);
      tool_reqs.push("Negative rake for edge strength");
    }

    if (speed_max <= speed_min) warnings.push("Very narrow speed window — difficult to machine this alloy with selected tool");
    if (analysis.temperature_C > 900) warnings.push("Temperatures may cause rapid tool degradation");

    return {
      speed_range: {
        min_mpm: Math.round(speed_min * 10) / 10,
        max_mpm: Math.round(speed_max * 10) / 10,
        optimal_mpm: Math.round(optimal_speed * 10) / 10,
      },
      feed_range: {
        min_mm: feed_base.min,
        max_mm: feed_base.max,
        optimal_mm: Math.round(optimal_feed * 1000) / 1000,
      },
      depth_range: {
        min_mm: depth_base.min,
        max_mm: depth_base.max,
        optimal_mm: Math.round(optimal_depth * 100) / 100,
      },
      coolant_requirements: {
        type: coolant_type,
        pressure_bar: coolant_pressure,
        flow_rate_lpm: Math.round(coolant_flow * 10) / 10,
      },
      tool_material_requirements: tool_reqs,
      max_temperature_C: analysis.temperature_C,
      expected_tool_life_min: analysis.tool_life_min,
      warnings,
    };
  }

  /**
   * Enhanced superalloy analysis with learning algorithms.
   *
   * Augments analyzeNickelAlloy() with:
   * - ExtendedTaylorModel for temperature-derated tool life (ISO S group
   *   has steep n exponent 0.15-0.25, making temperature correction critical)
   * - BayesianWearModel for posterior crater wear rate from observed data
   *   (superalloys have high batch-to-batch scatter in work hardening)
   *
   * The learning loop: run 3-5 tools → measure crater depths → this method
   * narrows the Usui wear rate prediction → next tool gets better life estimate.
   *
   * Lazy-requires both algorithms; falls back to analyzeNickelAlloy() if unavailable.
   *
   * Reference: Usui (1984) crater wear; Taylor (1907) extended;
   *            Inconel 718 notch wear data (Sandvik 2020)
   */
  analyzeWithLearning(input: SuperalloyAnalyzeInput & {
    observed_crater_depths?: number[];
    temperature_factor?: number;
  }): SuperalloyAnalyzeResult & {
    learning_model_used: boolean;
    extended_taylor_life: number | null;
    posterior_crater_rate: number | null;
    crater_confidence_95: [number, number] | null;
    learning_recommendation: string;
  } {
    // Run base analysis for J-C physics
    const baseResult = this.analyzeNickelAlloy(input);

    // ISO S Taylor constants for superalloys (from TribalKnowledge: steep n exponent)
    const taylorMap: Record<SuperalloyType, { C: number; n: number }> = {
      inconel_718:  { C: 80,  n: 0.18 },
      inconel_625:  { C: 90,  n: 0.19 },
      waspaloy:     { C: 75,  n: 0.17 },
      rene_41:      { C: 65,  n: 0.16 },
      hastelloy_x:  { C: 95,  n: 0.20 },
      mar_m247:     { C: 55,  n: 0.15 },
    };

    const taylor = taylorMap[input.alloy] ?? taylorMap.inconel_718;
    const tempFactor = input.temperature_factor ?? 1.0;

    let learningUsed = false;
    let extTaylorLife: number | null = null;
    let posteriorRate: number | null = null;
    let craterCI: [number, number] | null = null;
    let learningRec = "No learning data — using Usui model only.";

    // Try ExtendedTaylorModel for temperature-corrected life
    try {
      const { ExtendedTaylorModel } = require("../algorithms/ExtendedTaylorModel.js");
      const etm = new ExtendedTaylorModel();
      const etResult = etm.calculate({
        cutting_speed: input.cutting_speed_mpm,
        C: taylor.C,
        n: taylor.n,
        feed: input.feed_mm,
        depth: input.depth_mm,
        feed_exponent: 0.32,
        depth_exponent: 0.18,
        ref_feed: 0.15,
        ref_depth: 1.5,
        temperature_factor: tempFactor,
      });
      extTaylorLife = etResult.tool_life_minutes;
      learningUsed = true;
    } catch {
      // ExtendedTaylorModel not available
    }

    // Try BayesianWearModel for crater wear posterior
    const observed = input.observed_crater_depths;
    if (observed && observed.length > 0) {
      try {
        const { BayesianWearModel } = require("../algorithms/BayesianWearModel.js");
        const bwm = new BayesianWearModel();

        // Prior: Usui-predicted crater rate (from base result's tool_life)
        const usui = USUI_PARAMS[input.tool_material ?? "carbide"];
        const toolLife = Math.max(baseResult.tool_life_min, 0.1);
        const priorRate = usui.max_crater_mm / toolLife;
        const priorStd = priorRate * 0.3; // 30% CV typical for superalloys

        // Convert crater depths (mm) to rates (mm/min) assuming each
        // observation is from one tool run lasting ~tool_life_min
        const observedRates = observed.map(d => d / toolLife);

        const bmResult = bwm.calculate({
          prior_mean: priorRate,
          prior_std: priorStd,
          observations: observedRates,
          likelihood_std: priorStd,
          vb_threshold: usui.max_crater_mm,
        });

        const postRate = bmResult.posterior_mean as number;
        posteriorRate = postRate;
        craterCI = bmResult.credible_interval_95;
        learningUsed = true;

        // Update tool life from posterior wear rate
        const posteriorLife = postRate > 1e-10
          ? usui.max_crater_mm / postRate : baseResult.tool_life_min;

        learningRec = bmResult.recommendation.startsWith("REPLACE")
          ? `REPLACE: Crater wear rate ${postRate.toFixed(4)} mm/min exceeds safe limit for ${input.alloy}.`
          : `Learning from ${observed.length} observations: posterior life ~${posteriorLife.toFixed(1)} min ` +
            `(${bmResult.uncertainty_reduction < 0.8 ? "uncertainty reduced" : "collect more data"}).`;
      } catch {
        // BayesianWearModel not available
      }
    }

    if (!learningUsed) {
      learningRec = "Learning algorithms unavailable — using Usui crater wear model only.";
    }

    return {
      ...baseResult,
      learning_model_used: learningUsed,
      extended_taylor_life: extTaylorLife !== null
        ? Math.round(extTaylorLife * 10) / 10 : null,
      posterior_crater_rate: posteriorRate !== null
        ? Math.round(posteriorRate * 10000) / 10000 : null,
      crater_confidence_95: craterCI,
      learning_recommendation: learningRec,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _recommendCoating(tool: string, temperature: number, alloy: SuperalloyType): string {
    if (tool === "ceramic") return "Uncoated (ceramic)";
    if (tool === "cbn" || tool === "pcbn") return "Uncoated or TiN (CBN/PCBN)";

    if (temperature > 800) return "AlCrN (high thermal stability to 1100°C)";
    if (temperature > 600) return "AlTiN (good to 900°C, high hot hardness)";
    if (alloy === "mar_m247" || alloy === "rene_41") return "TiAlN nanocomposite (extreme hardness)";
    return "TiAlN PVD (general purpose for nickel alloys)";
  }
}

/** Singleton instance */
export const superalloyMachiningEngine = new SuperalloyMachiningEngine();
